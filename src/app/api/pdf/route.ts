
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MAX_PDF_BYTES, removeUpload, saveBuffer } from "@/lib/storage";
import { chunkPages, extractPages, looksLikePdf } from "@/lib/pdf";
import { embedTexts, getGemini } from "@/lib/ai";

export const maxDuration = 120;

// GET /api/pdf -> my uploaded PDFs (owner-only)
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const documents = await prisma.document.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fileName: true,
      pageCount: true,
      sizeBytes: true,
      status: true,
      error: true,
      hasEmbeddings: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    documents,
    aiConfigured: !!getGemini(),
  });
}

// POST /api/pdf (multipart: file) -> validate, extract, chunk, embed, store
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user || !user.institutionId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (user.role !== "STUDENT" && user.role !== "TEACHER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "Choose a PDF file to upload." },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }

  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      {
        error: `PDF is too large (max ${Math.round(
          MAX_PDF_BYTES / 1024 / 1024
        )} MB).`,
      },
      { status: 413 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  if (!looksLikePdf(buf)) {
    return NextResponse.json(
      { error: "This file is not a valid PDF." },
      { status: 400 }
    );
  }

  let pages;

  try {
    pages = await extractPages(buf);
  } catch (e) {
    console.error("PDF parse error", e);

    return NextResponse.json(
      {
        error:
          "Could not read this PDF. It may be corrupted or password-protected.",
      },
      { status: 422 }
    );
  }

  const totalChars = pages.reduce((n, p) => n + p.text.length, 0);

  if (totalChars < 50) {
    return NextResponse.json(
      {
        error:
          "No readable text found. This looks like a scanned PDF (images of pages). Scanned documents need OCR processing first – run it through an OCR tool and upload the searchable version.",
        code: "NO_TEXT",
      },
      { status: 422 }
    );
  }

  const chunks = chunkPages(pages);
  const stored = await saveBuffer(buf, `pdfs/${user.id}`, file.name);

  const doc = await prisma.document.create({
    data: {
      institutionId: user.institutionId,
      ownerId: user.id,
      title: file.name.replace(/\.pdf$/i, ""),
      fileName: file.name,
      filePath: stored.filePath,
      sizeBytes: file.size,
      pageCount: pages.length,
      status: "PROCESSING",
    },
  });

  try {
    let vectors: number[][] | null = null;
    let note: string | null = null;

    if (getGemini()) {
      try {
        vectors = await embedTexts(
          chunks.map((c) => c.content),
          "RETRIEVAL_DOCUMENT"
        );
      } catch (e) {
        console.error("Gemini embedding error", e);
        note = "Gemini embeddings failed; keyword search will be used for this document.";
      }
    } else {
      note =
        "Gemini AI is not configured; the document is searchable by keywords only until GEMINI_API_KEY is set.";
    }

    await prisma.documentChunk.createMany({
      data: chunks.map((c, i) => ({
        documentId: doc.id,
        institutionId: user.institutionId!,
        ownerId: user.id,
        page: c.page,
        chunkIndex: c.chunkIndex,
        content: c.content,
        embedding: vectors ? vectors[i] : [],
      })),
    });

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        status: "READY",
        hasEmbeddings: !!vectors,
        error: note,
      },
    });

    return NextResponse.json({
      id: doc.id,
      pages: pages.length,
      chunks: chunks.length,
      note,
    });
  } catch (e) {
    console.error("PDF processing error", e);

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        status: "FAILED",
        error: "Processing failed. Please try again.",
      },
    });

    return NextResponse.json(
      { error: "Processing failed. Please try again." },
      { status: 500 }
    );
  }
}

// DELETE /api/pdf?id=... -> remove my document (+ chunks via cascade, + file)
export async function DELETE(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.document.delete({ where: { id: doc.id } });
  await removeUpload(doc.filePath);

  return NextResponse.json({ ok: true });
}
