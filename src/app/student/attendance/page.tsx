import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, PageHeader, Progress, StatCard, Table, statusTone } from "@/components/ui";
import { attendanceByCourse, overallAttendance } from "@/lib/helpers";
import { fmtDate, pct } from "@/lib/utils";

export default async function StudentAttendance() {
  const { profile } = await requireStudent();
  const [byCourse, records] = await Promise.all([
    attendanceByCourse(profile.id),
    prisma.attendanceRecord.findMany({
      where: { studentId: profile.id },
      include: { session: { include: { course: { include: { subject: true } } } } },
      orderBy: { session: { date: "desc" } },
    }),
  ]);
  const overall = overallAttendance(byCourse);

  // monthly breakdown
  const months = new Map<string, { present: number; total: number }>();
  for (const r of records) {
    const key = r.session.date.toISOString().slice(0, 7);
    const m = months.get(key) ?? { present: 0, total: 0 };
    m.total++;
    if (r.status !== "ABSENT") m.present++;
    months.set(key, m);
  }
  const monthRows = Array.from(months.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <>
      <PageHeader title="Attendance" subtitle="Daily, subject-wise and monthly attendance. Minimum recommended: 75%." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Overall" value={overall.total ? `${overall.pct}%` : "—"} tone={overall.pct >= 75 ? "green" : "red"} hint={`${overall.present}/${overall.total} classes`} />
        <StatCard label="Classes attended" value={overall.present} tone="green" />
        <StatCard label="Classes missed" value={overall.total - overall.present} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-bold text-navy-900">By subject</h2>
          {byCourse.length === 0 ? <Empty>No attendance recorded yet.</Empty> : (
            <div className="space-y-4">
              {byCourse.map((a) => (
                <div key={a.courseId}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{a.subject}</span>
                    <span className={a.pct < 75 ? "font-semibold text-red-600" : "text-slate-500"}>{a.pct}% ({a.present}/{a.total})</span>
                  </div>
                  <Progress value={a.pct} />
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="card">
          <h2 className="mb-3 font-bold text-navy-900">Monthly</h2>
          {monthRows.length === 0 ? <Empty>Nothing to show yet.</Empty> : (
            <Table head={["Month", "Attended", "Total", "%"]}>
              {monthRows.map(([m, v]) => (
                <tr key={m}>
                  <td className="td font-medium">{new Date(m + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</td>
                  <td className="td">{v.present}</td>
                  <td className="td">{v.total}</td>
                  <td className="td">{pct(v.present, v.total)}%</td>
                </tr>
              ))}
            </Table>
          )}
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-bold text-navy-900">Daily log</h2>
        {records.length === 0 ? <Empty>No records.</Empty> : (
          <Table head={["Date", "Subject", "Status"]}>
            {records.slice(0, 60).map((r) => (
              <tr key={r.id}>
                <td className="td">{fmtDate(r.session.date)}</td>
                <td className="td">{r.session.course.subject.name}</td>
                <td className="td"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </>
  );
}
