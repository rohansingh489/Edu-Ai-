"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { flash, parseForm } from "@/lib/flash";
import { notifyUsers } from "@/lib/notify";
import { assertUploadAllowed, optionalFile, saveUpload } from "@/lib/storage";
import { reqId } from "@/lib/helpers";
import { redirect } from "next/navigation";

const BACK_OK = /^\/(student\/messages|teacher\/messages|teacher\/queries)$/;

async function maybeUpload(fd: FormData, back: string) {
  const file = optionalFile(fd, "file");
  if (!file) return {};
  try {
    assertUploadAllowed(file);
  } catch (e) {
    flash(back, "err", (e as Error).message);
  }
  return saveUpload(file!, "messages");
}

const startSchema = z.object({
  courseId: reqId("Subject"),
  subject: z.string().trim().max(150).optional(),
  body: z.string().trim().min(1, "Write a message").max(5000),
});

/** Student starts (or continues) a conversation with the teacher of one of their subjects. */
export async function startConversation(fd: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT" || !user.institutionId) redirect("/login/student");
  const back = "/student/messages";
  const d = parseForm(startSchema, fd, back);

  const sp = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  if (!sp) flash(back, "err", "Student profile not found.");
  const ta = await prisma.teachingAssignment.findFirst({
    where: { courseId: d.courseId, course: { enrollments: { some: { studentId: sp!.id } } } },
    include: { teacher: true },
  });
  if (!ta) flash(back, "err", "You can only message teachers who teach you.");
  const teacherUserId = ta!.teacher.userId;

  const attach = await maybeUpload(fd, back);
  let convo = await prisma.conversation.findFirst({
    where: { studentId: user.id, teacherId: teacherUserId, courseId: d.courseId },
  });
  if (!convo) {
    convo = await prisma.conversation.create({
      data: {
        institutionId: user.institutionId,
        studentId: user.id,
        teacherId: teacherUserId,
        courseId: d.courseId,
        subject: d.subject || null,
      },
    });
  }
  await prisma.message.create({ data: { conversationId: convo.id, senderId: user.id, body: d.body, ...attach } });
  await prisma.conversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } });
  await notifyUsers([teacherUserId], user.institutionId, {
    type: "MESSAGE",
    title: `New message from ${user.name}`,
    body: d.body.slice(0, 120),
    link: `/teacher/messages?c=${convo.id}`,
  });
  flash(`${back}?c=${convo.id}`, "ok", "Message sent.");
}

const sendSchema = z.object({
  conversationId: reqId("Conversation"),
  body: z.string().trim().min(1, "Write a message").max(5000),
  back: z.string().regex(BACK_OK, "Invalid page"),
});

/** Reply inside an existing conversation (student or teacher participant only). */
export async function sendMessage(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const rawBack = String(fd.get("back") || "/student/messages");
  const safeBack = BACK_OK.test(rawBack) ? rawBack : "/student/messages";
  const d = parseForm(sendSchema, fd, safeBack);

  const convo = await prisma.conversation.findFirst({
    where: { id: d.conversationId, OR: [{ studentId: user.id }, { teacherId: user.id }] },
  });
  if (!convo) flash(safeBack, "err", "Conversation not found.");

  const attach = await maybeUpload(fd, `${d.back}?c=${d.conversationId}`);
  await prisma.message.create({ data: { conversationId: convo!.id, senderId: user.id, body: d.body, ...attach } });
  await prisma.conversation.update({ where: { id: convo!.id }, data: { updatedAt: new Date() } });
  const other = convo!.studentId === user.id ? convo!.teacherId : convo!.studentId;
  await notifyUsers([other], convo!.institutionId, {
    type: "MESSAGE",
    title: `New message from ${user.name}`,
    body: d.body.slice(0, 120),
    link: user.role === "STUDENT" ? `/teacher/messages?c=${convo!.id}` : `/student/messages?c=${convo!.id}`,
  });
  flash(`${d.back}?c=${convo!.id}`, "ok", "Message sent.");
}
