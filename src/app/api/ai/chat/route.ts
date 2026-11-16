
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  AI_NOT_CONFIGURED,
  EDUBOT_SYSTEM,
  generateAIResponse,
  getGemini,
  parseJsonAnswer,
} from "@/lib/ai";

const bodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1, "Type a question first").max(4000, "Message is too long"),
});

// GET /api/ai/chat -> list my conversations
// GET /api/ai/chat?conversationId=... -> messages of one conversation
export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("conversationId");

  if (!id) {
    const list = await prisma.aIConversation.findMany({
      where: { userId: user.id, kind: "CHAT" },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, title: true, updatedAt: true },
    });

    return NextResponse.json({
      conversations: list,
      configured: !!getGemini(),
    });
  }

  const convo = await prisma.aIConversation.findFirst({
    where: { id, userId: user.id, kind: "CHAT" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!convo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ messages: convo.messages });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  if (!getGemini()) {
    return NextResponse.json(
      { error: AI_NOT_CONFIGURED, code: "AI_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const { message } = parsed.data;

  let convo = parsed.data.conversationId
    ? await prisma.aIConversation.findFirst({
        where: {
          id: parsed.data.conversationId,
          userId: user.id,
          kind: "CHAT",
        },
      })
    : null;

  if (parsed.data.conversationId && !convo) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  if (!convo) {
    convo = await prisma.aIConversation.create({
      data: {
        userId: user.id,
        institutionId: user.institutionId,
        kind: "CHAT",
        title: message.slice(0, 60),
      },
    });
  }

  const history = await prisma.aIMessage.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "desc" },
    take: 16,
  });

  history.reverse();

  try {
    const prompt = [
      ...history.map((m) => {
        const role = m.role === "USER" ? "Student" : "EduBot";
        return `${role}: ${m.content}`;
      }),
      `Student: ${message}`,
    ].join("\n\n");

    const raw = await generateAIResponse(EDUBOT_SYSTEM, prompt);
    const out = parseJsonAnswer(raw);

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
        meta: { followUps: out.followUps },
      },
    });

    await prisma.aIConversation.update({
      where: { id: convo.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      conversationId: convo.id,
      answer: out.answer,
      followUps: out.followUps,
    });
  } catch (e) {
    console.error("Gemini chat error", e);

    return NextResponse.json(
      { error: "The AI service failed to respond. Please try again." },
      { status: 502 }
    );
  }
}

// DELETE /api/ai/chat?conversationId=... -> clear conversation
export async function DELETE(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("conversationId");

  if (!id) {
    return NextResponse.json(
      { error: "conversationId required" },
      { status: 400 }
    );
  }

  await prisma.aIConversation.deleteMany({
    where: { id, userId: user.id, kind: "CHAT" },
  });

  return NextResponse.json({ ok: true });
}
