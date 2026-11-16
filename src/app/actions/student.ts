"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { flash, parseForm } from "@/lib/flash";
import { audit, notifyUsers } from "@/lib/notify";
import { assertUploadAllowed, optionalFile, saveUpload } from "@/lib/storage";
import { must, nextTicket, reqId } from "@/lib/helpers";

const submitSchema = z.object({
  assignmentId: reqId("Assignment"),
  content: z.string().trim().max(10000).optional(),
});

export async function submitAssignment(fd: FormData) {
  const { user, profile, institutionId } = await requireStudent();
  const back = "/student/assignments";
  const d = parseForm(submitSchema, fd, back);

  const assignment = must(
    await prisma.assignment.findFirst({
      where: { id: d.assignmentId, institutionId, course: { enrollments: { some: { studentId: profile.id } } } },
      include: { teacher: true },
    }),
    back,
    "Assignment not found."
  );

  const file = optionalFile(fd, "file");
  if (!d.content && !file) flash(back, "err", "Write an answer or attach a file.");
  let stored: { filePath?: string; fileName?: string } = {};
  if (file) {
    try {
      assertUploadAllowed(file);
    } catch (e) {
      flash(back, "err", (e as Error).message);
    }
    stored = await saveUpload(file, "submissions");
  }

  await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: profile.id } },
    create: { assignmentId: assignment.id, studentId: profile.id, content: d.content || null, ...stored },
    update: { content: d.content || null, submittedAt: new Date(), ...stored, marks: null, feedback: null, gradedAt: null },
  });
  await notifyUsers([assignment.teacher.userId], institutionId, {
    type: "ASSIGNMENT",
    title: "New submission",
    body: `${user.name} submitted "${assignment.title}".`,
    link: `/teacher/assignments/${assignment.id}`,
  });
  flash(back, "ok", "Assignment submitted.");
}

const complaintSchema = z.object({
  title: z.string().trim().min(5, "Title is too short").max(150),
  description: z.string().trim().min(15, "Please describe the problem in more detail").max(4000),
  category: z.enum(["ACADEMIC", "ATTENDANCE", "EXAMINATION", "FEE", "LIBRARY", "HOSTEL", "TECHNICAL", "OTHER"]),
});

export async function createComplaint(fd: FormData) {
  const { user, institutionId } = await requireStudent();
  const back = "/student/complaints";
  const d = parseForm(complaintSchema, fd, back);
  const ticket = await nextTicket();
  const c = await prisma.complaint.create({
    data: {
      ticket,
      institutionId,
      studentId: user.id,
      ...d,
      history: [{ at: new Date().toISOString(), status: "PENDING", note: "Complaint submitted", by: user.name }],
    },
  });
  const admins = await prisma.user.findMany({ where: { institutionId, role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true }, select: { id: true } });
  await notifyUsers(admins.map((a) => a.id), institutionId, {
    type: "COMPLAINT",
    title: `New complaint ${ticket}`,
    body: d.title,
    link: "/admin/complaints",
  });
  await audit(user.id, institutionId, "COMPLAINT_CREATED", "Complaint", c.id);
  flash(back, "ok", `Complaint submitted. Your ticket ID is ${ticket}.`);
}
