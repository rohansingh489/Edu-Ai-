"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { flash, parseForm } from "@/lib/flash";
import { notifyUsers } from "@/lib/notify";
import { assertUploadAllowed, optionalFile, saveUpload } from "@/lib/storage";
import { audienceUserIds, must, optText, reqId } from "@/lib/helpers";
import { gradeFor, pct } from "@/lib/utils";

/** The teacher must be assigned to the course. Returns the course with its enrolled students. */
async function ownCourse(teacherId: string, courseId: string, back: string) {
  return must(
    await prisma.course.findFirst({
      where: { id: courseId, teachingAssignments: { some: { teacherId } } },
      include: {
        subject: true,
        classSection: true,
        enrollments: { include: { student: { select: { id: true, userId: true } } } },
      },
    }),
    back,
    "You are not assigned to this course."
  );
}

// ---------- Attendance ----------
export async function saveAttendance(fd: FormData) {
  const { profile, institutionId } = await requireTeacher();
  const courseId = String(fd.get("courseId") || "");
  const date = String(fd.get("date") || "");
  const back = `/teacher/attendance?course=${courseId}&date=${date}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) flash("/teacher/attendance", "err", "Choose a valid date.");
  const course = await ownCourse(profile.id, courseId, "/teacher/attendance");

  const day = new Date(`${date}T00:00:00.000Z`);
  const session = await prisma.attendanceSession.upsert({
    where: { courseId_date: { courseId, date: day } },
    create: { institutionId, courseId, teacherId: profile.id, date: day },
    update: { teacherId: profile.id },
  });

  const warn: string[] = [];
  for (const e of course.enrollments) {
    const raw = String(fd.get(`status_${e.studentId}`) || "PRESENT");
    const status = raw === "ABSENT" || raw === "LATE" ? raw : "PRESENT";
    await prisma.attendanceRecord.upsert({
      where: { sessionId_studentId: { sessionId: session.id, studentId: e.studentId } },
      create: { sessionId: session.id, studentId: e.studentId, status },
      update: { status },
    });
    // low-attendance warning (< 75%) once there are at least 5 sessions
    const recs = await prisma.attendanceRecord.findMany({ where: { studentId: e.studentId, session: { courseId } }, select: { status: true } });
    if (recs.length >= 5) {
      const present = recs.filter((r) => r.status !== "ABSENT").length;
      if (pct(present, recs.length) < 75 && status === "ABSENT") warn.push(e.student.userId);
    }
  }
  await notifyUsers(warn, institutionId, {
    type: "ATTENDANCE",
    title: "Attendance warning",
    body: `Your attendance in ${course.subject.name} has dropped below 75%.`,
    link: "/student/attendance",
  });
  flash(back, "ok", `Attendance saved for ${course.enrollments.length} students.`);
}

// ---------- Assignments ----------
const assignmentSchema = z.object({
  courseId: reqId("Course"),
  title: z.string().trim().min(3, "Title is too short").max(150),
  description: z.string().trim().min(5, "Add instructions").max(5000),
  dueDate: z.string().min(1, "Choose a due date"),
  maxMarks: z.coerce.number().int().min(1).max(1000),
});

export async function createAssignment(fd: FormData) {
  const { profile, institutionId } = await requireTeacher();
  const back = "/teacher/assignments";
  const d = parseForm(assignmentSchema, fd, back);
  const due = new Date(d.dueDate);
  if (isNaN(due.getTime())) flash(back, "err", "Invalid due date.");
  const course = await ownCourse(profile.id, d.courseId, back);
  const a = await prisma.assignment.create({
    data: { institutionId, courseId: d.courseId, teacherId: profile.id, title: d.title, description: d.description, dueDate: due, maxMarks: d.maxMarks },
  });
  await notifyUsers(course.enrollments.map((e) => e.student.userId), institutionId, {
    type: "ASSIGNMENT",
    title: `New assignment: ${d.title}`,
    body: `${course.subject.name} – due ${due.toLocaleDateString("en-IN")}`,
    link: "/student/assignments",
  });
  flash(`/teacher/assignments/${a.id}`, "ok", "Assignment created and students notified.");
}

const gradeSchema = z.object({
  submissionId: reqId("Submission"),
  marks: z.coerce.number().min(0),
  feedback: optText(2000),
});

export async function gradeSubmission(fd: FormData) {
  const { profile, institutionId } = await requireTeacher();
  const d = parseForm(gradeSchema, fd, "/teacher/assignments");
  const sub = must(
    await prisma.assignmentSubmission.findFirst({
      where: { id: d.submissionId, assignment: { teacherId: profile.id } },
      include: { assignment: true, student: true },
    }),
    "/teacher/assignments"
  );
  const back = `/teacher/assignments/${sub.assignmentId}`;
  if (d.marks > sub.assignment.maxMarks) flash(back, "err", `Marks cannot exceed ${sub.assignment.maxMarks}.`);
  await prisma.assignmentSubmission.update({
    where: { id: sub.id },
    data: { marks: Math.round(d.marks), feedback: d.feedback ?? null, gradedAt: new Date() },
  });
  await notifyUsers([sub.student.userId], institutionId, {
    type: "ASSIGNMENT",
    title: `Assignment graded: ${sub.assignment.title}`,
    body: `You scored ${Math.round(d.marks)}/${sub.assignment.maxMarks}.`,
    link: "/student/assignments",
  });
  flash(back, "ok", "Grade saved.");
}

// ---------- Study materials ----------
const materialSchema = z.object({
  courseId: reqId("Course"),
  title: z.string().trim().min(3, "Title is too short").max(150),
  description: optText(1000),
  type: z.enum(["NOTES", "SUBJECT_MATERIAL", "PRESENTATION", "DOCUMENT", "QUESTION_PAPER", "VIDEO"]),
  videoUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .pipe(z.string().url("Enter a valid video link").optional()),
});

export async function uploadMaterial(fd: FormData) {
  const { user, profile, institutionId } = await requireTeacher();
  const back = "/teacher/materials";
  const d = parseForm(materialSchema, fd, back);
  const course = await ownCourse(profile.id, d.courseId, back);
  const file = optionalFile(fd, "file");
  if (!file && !d.videoUrl) flash(back, "err", "Attach a file or provide a video link.");
  let stored: { filePath?: string; fileName?: string } = {};
  if (file) {
    try {
      assertUploadAllowed(file);
    } catch (e) {
      flash(back, "err", (e as Error).message);
    }
    stored = await saveUpload(file, "materials");
  }
  await prisma.studyMaterial.create({
    data: {
      institutionId,
      courseId: d.courseId,
      uploadedById: user.id,
      title: d.title,
      description: d.description,
      type: d.type,
      videoUrl: d.videoUrl,
      ...stored,
    },
  });
  await notifyUsers(course.enrollments.map((e) => e.student.userId), institutionId, {
    type: "MATERIAL",
    title: `New study material: ${d.title}`,
    body: course.subject.name,
    link: "/student/materials",
  });
  flash(back, "ok", "Material uploaded and students notified.");
}

export async function deleteMaterial(fd: FormData) {
  const { user } = await requireTeacher();
  const id = String(fd.get("id") || "");
  await prisma.studyMaterial.deleteMany({ where: { id, uploadedById: user.id } });
  flash("/teacher/materials", "ok", "Material deleted.");
}

// ---------- Exams & marks ----------
const examSchema = z.object({
  courseId: reqId("Course"),
  title: z.string().trim().min(3).max(150),
  type: z.enum(["INTERNAL", "FINAL"]),
  date: z.string().min(1, "Choose a date"),
  maxMarks: z.coerce.number().int().min(1).max(1000),
  passMarks: z.coerce.number().int().min(0).max(1000),
});

export async function createExamTeacher(fd: FormData) {
  const { profile, institutionId } = await requireTeacher();
  const back = "/teacher/results";
  const d = parseForm(examSchema, fd, back);
  if (d.passMarks > d.maxMarks) flash(back, "err", "Pass marks cannot exceed maximum marks.");
  const course = await ownCourse(profile.id, d.courseId, back);
  const exam = await prisma.examination.create({
    data: { institutionId, courseId: d.courseId, title: d.title, type: d.type, date: new Date(d.date), maxMarks: d.maxMarks, passMarks: d.passMarks },
  });
  await notifyUsers(course.enrollments.map((e) => e.student.userId), institutionId, {
    type: "EXAM",
    title: `Exam scheduled: ${d.title}`,
    body: `${course.subject.name} on ${new Date(d.date).toLocaleDateString("en-IN")}`,
    link: "/student/results",
  });
  flash(`/teacher/results?exam=${exam.id}`, "ok", "Examination created.");
}

export async function saveMarks(fd: FormData) {
  const { profile, institutionId } = await requireTeacher();
  const examId = String(fd.get("examId") || "");
  const back = `/teacher/results?exam=${examId}`;
  const exam = must(
    await prisma.examination.findFirst({
      where: { id: examId, institutionId, course: { teachingAssignments: { some: { teacherId: profile.id } } } },
      include: { course: { include: { subject: true, enrollments: { include: { student: { select: { id: true, userId: true } } } } } } },
    }),
    "/teacher/results",
    "Examination not found."
  );
  let saved = 0;
  for (const e of exam.course.enrollments) {
    const raw = String(fd.get(`marks_${e.studentId}`) ?? "").trim();
    if (raw === "") continue;
    const marks = Number(raw);
    if (!Number.isFinite(marks) || marks < 0 || marks > exam.maxMarks) {
      flash(back, "err", `Marks must be between 0 and ${exam.maxMarks}.`);
    }
    const grade = marks < exam.passMarks ? "F" : gradeFor(pct(marks, exam.maxMarks));
    await prisma.studentResult.upsert({
      where: { examinationId_studentId: { examinationId: exam.id, studentId: e.studentId } },
      create: { examinationId: exam.id, studentId: e.studentId, marks, grade },
      update: { marks, grade },
    });
    saved++;
  }
  const publish = fd.get("publish") === "on";
  if (publish && !exam.resultsPublished) {
    await prisma.examination.update({ where: { id: exam.id }, data: { resultsPublished: true } });
    await notifyUsers(exam.course.enrollments.map((e) => e.student.userId), institutionId, {
      type: "RESULT",
      title: `Result published: ${exam.title}`,
      body: exam.course.subject.name,
      link: "/student/results",
    });
  }
  flash(back, "ok", `Saved marks for ${saved} students${publish ? " and published results" : ""}.`);
}

// ---------- Announcements ----------
const annSchema = z.object({
  title: z.string().trim().min(3).max(150),
  body: z.string().trim().min(5).max(3000),
  audience: z.string().min(1),
});

export async function publishAnnouncementTeacher(fd: FormData) {
  const { user, profile, institutionId } = await requireTeacher();
  const back = "/teacher/dashboard";
  const d = parseForm(annSchema, fd, back);
  // A teacher may only target the whole student body or a class they teach.
  if (d.audience !== "STUDENT") {
    const ok = await prisma.course.findFirst({ where: { classSectionId: d.audience, teachingAssignments: { some: { teacherId: profile.id } } } });
    if (!ok) flash(back, "err", "You can only announce to classes you teach.");
  }
  await prisma.announcement.create({ data: { institutionId, authorId: user.id, title: d.title, body: d.body, audience: d.audience } });
  await notifyUsers(await audienceUserIds(institutionId, d.audience), institutionId, {
    type: "ANNOUNCEMENT",
    title: d.title,
    body: d.body.slice(0, 140),
    link: "/student/notifications",
  });
  flash(back, "ok", "Announcement published.");
}
