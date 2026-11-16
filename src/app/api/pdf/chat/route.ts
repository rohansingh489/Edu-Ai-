import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  AI_NOT_CONFIGURED,
  PDF_SYSTEM,
  cosine,
  embedTexts,
  generateAIResponse,
  getGemini,
  parseJsonAnswer,
} from "@/lib/ai";
import { isBroadQuestion, keywordScore, keywords, requestedPage } from "@/lib/pdf";

const schema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
  message: z.string().trim().min(1, "Type a question first").max(4000, "Message is too long"),
});

// GET /api/pdf/chat?documentId=... -> fetch conversation history for a PDF
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  const convo = await prisma.aIConversation.findFirst({
    where: { documentId, userId: user.id, kind: "PDF" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ messages: convo?.messages ?? [] });
}

// POST /api/pdf/chat -> ask a question about an uploaded document
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (!getGemini()) {
    return NextResponse.json({ error: AI_NOT_CONFIGURED, code: "AI_NOT_CONFIGURED" }, { status: 503 });
  }

  const { documentId, message } = parsed.data;

  const doc = await prisma.document.findFirst({
    where: { id: documentId, ownerId: user.id },
    include: { chunks: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (doc.chunks.length === 0) {
    return NextResponse.json({ error: "No text chunks found for this document." }, { status: 400 });
  }

  let convo = await prisma.aIConversation.findFirst({
    where: { documentId, userId: user.id, kind: "PDF" },
  });

  if (!convo) {
    convo = await prisma.aIConversation.create({
      data: {
        userId: user.id,
        institutionId: user.institutionId,
        documentId: doc.id,
        kind: "PDF",
        title: `${doc.title} - Chat`,
      },
    });
  }

  const page = requestedPage(message);
  let relevantChunks = doc.chunks;

  if (page !== null) {
    const pageChunks = doc.chunks.filter((c) => c.page === page);
    if (pageChunks.length > 0) relevantChunks = pageChunks;
  }

  let topChunks = relevantChunks;

  if (doc.hasEmbeddings) {
    try {
      const [queryVec] = await embedTexts([message], "RETRIEVAL_QUERY");
      if (queryVec) {
        topChunks = [...relevantChunks]
          .map((c) => ({
            chunk: c,
            score: c.embedding.length ? cosine(queryVec, c.embedding) : 0,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
          .map((x) => x.chunk);
      }
    } catch {
      // fallback to keyword scoring
    }
  }

  if (topChunks.length === relevantChunks.length && !isBroadQuestion(message)) {
    const words = keywords(message);
    topChunks = [...relevantChunks]
      .map((c) => ({ chunk: c, score: keywordScore(c.content, words) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.chunk);
  } else if (topChunks.length > 6) {
    topChunks = topChunks.slice(0, 6);
  }

  const excerpts = topChunks
    .map((c) => `[Page ${c.page}]\n${c.content}`)
    .join("\n\n---\n\n");

  const prompt = `EXCERPTS:\n${excerpts}\n\nSTUDENT QUESTION: ${message}`;

  try {
    const raw = await generateAIResponse(PDF_SYSTEM, prompt);
    const out = parseJsonAnswer(raw);

    const sources = topChunks.map((c) => ({
      page: c.page,
      snippet: c.content.slice(0, 160) + "...",
    }));

    await prisma.aIMessage.create({
      data: {
        conversationId: convo.id,
        role: "USER",
        content: message,
      },
    });

    await prisma.aIMessage.create({
      data: {
        conversationId: convo.id,
        role: "ASSISTANT",
        content: out.answer,
        meta: { followUps: out.followUps, sources },
      },
    });

    await prisma.aIConversation.update({
      where: { id: convo.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      answer: out.answer,
      followUps: out.followUps,
      sources,
    });
  } catch (err) {
    console.error("PDF chat error", err);
    return NextResponse.json(
      { error: "The AI service failed to respond. Please try again." },
      { status: 502 }
    );
  }
}

// DELETE /api/pdf/chat?documentId=... -> clear chat history for a PDF
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  await prisma.aIConversation.deleteMany({
    where: { documentId, userId: user.id, kind: "PDF" },
  });

  return NextResponse.json({ ok: true });
}
