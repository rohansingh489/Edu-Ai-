import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, PageHeader, StatCard, Table } from "@/components/ui";
import { fmtDate, pct } from "@/lib/utils";

export default async function StudentResults() {
  const { profile, institutionId } = await requireStudent();
  const [results, upcoming] = await Promise.all([
    prisma.studentResult.findMany({
      where: { studentId: profile.id, examination: { resultsPublished: true } },
      include: { examination: { include: { course: { include: { subject: true } } } } },
      orderBy: { examination: { date: "desc" } },
    }),
    prisma.examination.findMany({
      where: { institutionId, date: { gte: new Date() }, course: { enrollments: { some: { studentId: profile.id } } } },
      include: { course: { include: { subject: true } } },
      orderBy: { date: "asc" },
    }),
  ]);
  const avg = results.length ? Math.round((results.reduce((n, r) => n + pct(r.marks, r.examination.maxMarks), 0) / results.length) * 10) / 10 : null;
  const internal = results.filter((r) => r.examination.type === "INTERNAL");
  const final = results.filter((r) => r.examination.type === "FINAL");

  const Block = ({ title, rows }: { title: string; rows: typeof results }) => (
    <section className="mt-6">
      <h2 className="mb-3 font-bold text-navy-900">{title}</h2>
      {rows.length === 0 ? <Empty>No results published yet.</Empty> : (
        <Table head={["Exam", "Subject", "Date", "Marks", "%", "Grade"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="td font-medium">{r.examination.title}</td>
              <td className="td">{r.examination.course.subject.name}</td>
              <td className="td">{fmtDate(r.examination.date)}</td>
              <td className="td">{r.marks}/{r.examination.maxMarks}</td>
              <td className="td">{pct(r.marks, r.examination.maxMarks)}%</td>
              <td className="td"><Badge tone={r.grade === "F" ? "red" : "green"}>{r.grade}</Badge></td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );

  return (
    <>
      <PageHeader title="Results & examinations" subtitle="Published marks, grades and your upcoming exam timetable." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Average" value={avg !== null ? `${avg}%` : "—"} tone="navy" />
        <StatCard label="Results published" value={results.length} tone="blue" />
        <StatCard label="Upcoming exams" value={upcoming.length} tone="amber" />
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-bold text-navy-900">Examination timetable</h2>
        {upcoming.length === 0 ? <Empty>No upcoming examinations scheduled.</Empty> : (
          <Table head={["Date", "Exam", "Subject", "Type", "Max marks"]}>
            {upcoming.map((e) => (
              <tr key={e.id}>
                <td className="td">{fmtDate(e.date)}</td>
                <td className="td font-medium">{e.title}</td>
                <td className="td">{e.course.subject.name}</td>
                <td className="td"><Badge tone="blue">{e.type}</Badge></td>
                <td className="td">{e.maxMarks}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
      <Block title="Internal assessments" rows={internal} />
      <Block title="Final examinations" rows={final} />
    </>
  );
}
