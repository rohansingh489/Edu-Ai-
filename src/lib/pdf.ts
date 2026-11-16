import { extractText, getDocumentProxy } from "unpdf";

export type PageText = { page: number; text: string };
export type Chunk = { page: number; chunkIndex: number; content: string };

/** True only if the bytes start with the PDF magic header. */
export function looksLikePdf(buf: Buffer) {
  return buf.subarray(0, 5).toString("latin1") === "%PDF-";
}

export async function extractPages(buf: Buffer): Promise<PageText[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  return pages.map((t, i) => ({ page: i + 1, text: normalize(t) }));
}

function normalize(t: string) {
  return t.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// ~4 characters per token. Target ≈ 650 tokens (2600 chars) with ≈ 80 tokens (320 chars) overlap.
const TARGET_CHARS = 2600;
const OVERLAP_CHARS = 320;

/** Splits each page into overlapping chunks, always preserving the page number. */
export function chunkPages(pages: PageText[]): Chunk[] {
  const chunks: Chunk[] = [];
  let idx = 0;
  for (const p of pages) {
    const text = p.text;
    if (text.length < 20) continue;
    if (text.length <= TARGET_CHARS) {
      chunks.push({ page: p.page, chunkIndex: idx++, content: text });
      continue;
    }
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + TARGET_CHARS, text.length);
      if (end < text.length) {
        // prefer to cut at a paragraph or sentence boundary
        const window = text.slice(start + TARGET_CHARS * 0.6, end);
        const cut = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "), window.lastIndexOf("\n"));
        if (cut > 0) end = start + Math.floor(TARGET_CHARS * 0.6) + cut + 1;
      }
      chunks.push({ page: p.page, chunkIndex: idx++, content: text.slice(start, end).trim() });
      if (end >= text.length) break;
      start = Math.max(end - OVERLAP_CHARS, start + 1);
    }
  }
  return chunks;
}

const STOP = new Set(
  "the a an and or of to in is are was were be for on with as by at from that this it its what which who how why explain define find about page tell me give please can you your into then than".split(" ")
);

export function keywords(q: string) {
  return Array.from(
    new Set(
      q
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length > 2 && !STOP.has(w))
    )
  );
}

/** Keyword relevance fallback used when no embeddings are available. */
export function keywordScore(content: string, words: string[]) {
  if (!words.length) return 0;
  const c = content.toLowerCase();
  let s = 0;
  for (const w of words) {
    let i = c.indexOf(w);
    let n = 0;
    while (i !== -1 && n < 5) {
      n++;
      i = c.indexOf(w, i + w.length);
    }
    s += n;
  }
  return s;
}

/** Detects "page 10", "pg 10", "p. 10" in a question. */
export function requestedPage(q: string): number | null {
  const m = q.match(/\b(?:page|pg|p\.?)\s*(\d{1,4})\b/i) || q.match(/पेज\s*(\d{1,4})/);
  return m ? Number(m[1]) : null;
}

/** Questions that need the whole document rather than a few matching passages. */
export function isBroadQuestion(q: string) {
  return /\b(summar|entire|whole|overview|important topics|key points|all topics|chapter|exam notes|notes from|mcqs?|questions? from)\b/i.test(q);
}
