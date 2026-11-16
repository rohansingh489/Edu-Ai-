import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { teacherCourses } from "@/lib/teacher";
import { Badge, Empty, PageHeader, Table } from "@/components/ui";
import { pct } from "@/lib/utils";

export default async function TeacherStudents() {
  const { profile } = await requireTeacher();
  const courses = await teacherCourses(profile.id);
  const ids = courses.map((c) => c.id);
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: { in: ids } },
    include: { student: { include: { user: { select: { name: true, loginId: true, email: true, isActive: true } }, classSection: true } } },
  });
  const [records, results] = await Promise.all([
    prisma.attendanceRecord.findMany({ where: { session: { courseId: { in: ids } } }, select: { studentId: true, status: true } }),
    prisma.studentResult.findMany({ where: { examination: { courseId: { in: ids } } }, select: { studentId: true, marks: true, examination: { select: { maxMarks: true } } } }),
  ]);
  const att = new Map<string, { p: number; t: number }>();
  for (const r of records) { const a = att.get(r.studentId) ?? { p: 0, t: 0 }; a.t++; if (r.status !== "ABSENT") a.p++; att.set(r.studentId, a); }
  const perf = new Map<string, number[]>();
  for (const r of results) perf.set(r.studentId, [...(perf.get(r.studentId) ?? []), pct(r.marks, r.examination.maxMarks)]);
  const students = Array.from(new Map(enrollments.map((e) => [e.studentId, e.student])).values()).sort((a, b) => a.user.name.localeCompare(b.user.name));
  return (
    <>
      <PageHeader title="My students" subtitle="Only students enrolled in your subjects are shown, with attendance and performance." />
      {students.length === 0 ? <Empty>No students yet.</Empty> : (
        <Table head={["Name", "ID", "Class", "Roll", "Attendance", "Avg. marks"]}>
          {students.map((s) => {
            const a = att.get(s.id); const ap = a ? pct(a.p, a.t) : null;
            const p = perf.get(s.id); const avg = p?.length ? Math.round((p.reduce((x, y) => x + y, 0) / p.length) * 10) / 10 : null;
            return (
              <tr key={s.id}>
                <td className="td font-medium">{s.user.name}</td><td className="td">{s.user.loginId}</td>
                <td className="td">{s.classSection?.name ?? "—"}</td><td className="td">{s.rollNo ?? "—"}</td>
                <td className="td">{ap === null ? "—" : <Badge tone={ap >= 75 ? "green" : "red"}>{ap}%</Badge>}</td>
                <td className="td">{avg === null ? "—" : `${avg}%`}</td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
