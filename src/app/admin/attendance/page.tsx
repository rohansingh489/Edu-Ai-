import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Badge, Empty, PageHeader, StatCard, Table } from "@/components/ui";
import { pct } from "@/lib/utils";

export default async function AdminAttendance() {
  const { institutionId } = await requireAdmin();
  const records = await prisma.attendanceRecord.findMany({
    where: { session: { institutionId } },
    select: { status: true, studentId: true, student: { select: { user: { select: { name: true, loginId: true } }, classSection: { select: { name: true } } } }, session: { select: { courseId: true, course: { select: { subject: { select: { name: true } }, classSection: { select: { name: true } } } } } } },
  });
  const byCourse = new Map<string, { label: string; p: number; t: number }>();
  const byStudent = new Map<string, { name: string; id: string; cls: string; p: number; t: number }>();
  for (const r of records) {
    const present = r.status !== "ABSENT" ? 1 : 0;
    const c = byCourse.get(r.session.courseId) ?? { label: `${r.session.course.subject.name} — ${r.session.course.classSection.name}`, p: 0, t: 0 };
    c.p += present; c.t++; byCourse.set(r.session.courseId, c);
    const s = byStudent.get(r.studentId) ?? { name: r.student.user.name, id: r.student.user.loginId, cls: r.student.classSection?.name ?? "—", p: 0, t: 0 };
    s.p += present; s.t++; byStudent.set(r.studentId, s);
  }
  const total = records.length, present = records.filter((r) => r.status !== "ABSENT").length;
  const low = Array.from(byStudent.values()).filter((s) => pct(s.p, s.t) < 75).sort((a, b) => pct(a.p, a.t) - pct(b.p, b.t));
  return (
    <>
      <PageHeader title="Attendance reports" subtitle="Institution-wide attendance. Students below 75% are flagged." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Overall attendance" value={total ? `${pct(present, total)}%` : "—"} tone="green" />
        <StatCard label="Records" value={total} tone="navy" />
        <StatCard label="Students below 75%" value={low.length} tone={low.length ? "red" : "green"} />
      </div>
      <h2 className="mb-3 mt-6 font-bold text-navy-900">By subject & class</h2>
      {byCourse.size === 0 ? <Empty>No attendance recorded yet.</Empty> : (
        <Table head={["Subject — class", "Present", "Total", "Attendance"]}>
          {Array.from(byCourse.values()).sort((a, b) => a.label.localeCompare(b.label)).map((c) => <tr key={c.label}><td className="td font-medium">{c.label}</td><td className="td">{c.p}</td><td className="td">{c.t}</td><td className="td"><Badge tone={pct(c.p, c.t) >= 75 ? "green" : "red"}>{pct(c.p, c.t)}%</Badge></td></tr>)}
        </Table>
      )}
      <h2 className="mb-3 mt-6 font-bold text-navy-900">Low attendance students</h2>
      {low.length === 0 ? <Empty>Nobody is below 75%.</Empty> : (
        <Table head={["Student", "ID", "Class", "Attendance"]}>
          {low.map((s) => <tr key={s.id}><td className="td font-medium">{s.name}</td><td className="td">{s.id}</td><td className="td">{s.cls}</td><td className="td"><Badge tone="red">{pct(s.p, s.t)}% ({s.p}/{s.t})</Badge></td></tr>)}
        </Table>
      )}
    </>
  );
}
