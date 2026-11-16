import { z } from "zod";
import { prisma } from "./prisma";
import { flash } from "./flash";
import { pct } from "./utils";

/** Empty string -> undefined, otherwise must be a UUID. */
export const optId = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined))
  .pipe(z.string().uuid("Invalid selection").optional());

export const reqId = (label = "Selection") => z.string().uuid(`${label} is required`);

export const optText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

export function must<T>(value: T | null | undefined, back: string, message = "Record not found or not allowed."): T {
  if (value === null || value === undefined) flash(back, "err", message);
  return value as T;
}

/** User ids that should receive an announcement for a given audience. */
export async function audienceUserIds(institutionId: string, audience: string) {
  if (audience === "ALL") {
    const u = await prisma.user.findMany({ where: { institutionId, isActive: true, role: { in: ["STUDENT", "TEACHER"] } }, select: { id: true } });
    return u.map((x) => x.id);
  }
  if (audience === "STUDENT" || audience === "TEACHER") {
    const u = await prisma.user.findMany({ where: { institutionId, isActive: true, role: audience }, select: { id: true } });
    return u.map((x) => x.id);
  }
  const sp = await prisma.studentProfile.findMany({
    where: { institutionId, classSectionId: audience, user: { isActive: true } },
    select: { userId: true },
  });
  return sp.map((x) => x.userId);
}

/** Enrol a student in every course of their class section. */
export async function enrollStudentInClass(studentId: string, classSectionId: string, institutionId: string) {
  const courses = await prisma.course.findMany({ where: { classSectionId, institutionId }, select: { id: true } });
  if (!courses.length) return;
  await prisma.enrollment.createMany({
    data: courses.map((c) => ({ studentId, courseId: c.id, institutionId })),
    skipDuplicates: true,
  });
}

/** Enrol every student of the course's class section in the course. */
export async function enrollClassInCourse(courseId: string, classSectionId: string, institutionId: string) {
  const students = await prisma.studentProfile.findMany({ where: { classSectionId, institutionId }, select: { id: true } });
  if (!students.length) return;
  await prisma.enrollment.createMany({
    data: students.map((s) => ({ studentId: s.id, courseId, institutionId })),
    skipDuplicates: true,
  });
}

export type CourseAttendance = { courseId: string; subject: string; present: number; total: number; pct: number };

/** Attendance per course for a student. LATE counts as present. */
export async function attendanceByCourse(studentId: string): Promise<CourseAttendance[]> {
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId },
    select: { status: true, session: { select: { courseId: true, course: { select: { subject: { select: { name: true } } } } } } },
  });
  const map = new Map<string, CourseAttendance>();
  for (const r of records) {
    const id = r.session.courseId;
    const row = map.get(id) ?? { courseId: id, subject: r.session.course.subject.name, present: 0, total: 0, pct: 0 };
    row.total++;
    if (r.status !== "ABSENT") row.present++;
    map.set(id, row);
  }
  return Array.from(map.values())
    .map((r) => ({ ...r, pct: pct(r.present, r.total) }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

export function overallAttendance(rows: CourseAttendance[]) {
  const present = rows.reduce((n, r) => n + r.present, 0);
  const total = rows.reduce((n, r) => n + r.total, 0);
  return { present, total, pct: pct(present, total) };
}

export async function nextTicket() {
  const year = new Date().getFullYear();
  const count = await prisma.complaint.count();
  for (let i = 1; i < 50; i++) {
    const ticket = `CMP-${year}-${String(count + i).padStart(4, "0")}`;
    const exists = await prisma.complaint.findUnique({ where: { ticket } });
    if (!exists) return ticket;
  }
  return `CMP-${year}-${Date.now()}`;
}

export function isUniqueError(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

export const courseLabel = (c: { subject: { name: string }; classSection: { name: string } }) => `${c.subject.name} — ${c.classSection.name}`;
