import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Badge, Empty, Field, Flash, PageHeader, Table, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createExamAdmin } from "@/app/actions/admin";
import { fmtDate, pct } from "@/lib/utils";

export default async function AdminExams({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { institutionId } = await requireAdmin();
  const [courses, exams] = await Promise.all([
    prisma.course.findMany({ where: { institutionId }, include: { subject: true, classSection: true }, orderBy: [{ classSection: { name: "asc" } }, { subject: { name: "asc" } }] }),
    prisma.examination.findMany({ where: { institutionId }, include: { course: { include: { subject: true, classSection: true } }, results: { select: { marks: true, grade: true } } }, orderBy: { date: "desc" } }),
  ]);
  return (
    <>
      <PageHeader title="Examinations & results" subtitle="Schedule exams (timetable) and monitor results entered by teachers." />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <form action={createExamAdmin} className="card h-fit space-y-3">
          <h2 className="font-bold text-navy-900">Schedule exam</h2>
          <Field label="Subject / class"><select name="courseId" className="input">{courses.map((c) => <option key={c.id} value={c.id}>{c.subject.name} — {c.classSection.name}</option>)}</select></Field>
          <Field label="Title"><input name="title" required minLength={3} className="input" /></Field>
          <Field label="Type"><select name="type" className="input"><option value="INTERNAL">Internal assessment</option><option value="FINAL">Final examination</option></select></Field>
          <Field label="Date"><input type="date" name="date" required className="input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max marks"><input type="number" name="maxMarks" defaultValue={100} min={1} className="input" /></Field>
            <Field label="Pass marks"><input type="number" name="passMarks" defaultValue={35} min={0} className="input" /></Field>
          </div>
          <SubmitButton className="w-full">Schedule & notify</SubmitButton>
        </form>
        <section className="lg:col-span-2">
          {exams.length === 0 ? <Empty>No examinations.</Empty> : (
            <Table head={["Date", "Exam", "Subject — class", "Type", "Results", "Avg %", "Pass %", "Status"]}>
              {exams.map((e) => {
                const n = e.results.length; const avg = n ? Math.round(e.results.reduce((s, r) => s + pct(r.marks, e.maxMarks), 0) / n) : null;
                const pass = n ? Math.round((e.results.filter((r) => r.grade !== "F").length / n) * 100) : null;
                return (
                  <tr key={e.id}>
                    <td className="td">{fmtDate(e.date)}</td><td className="td font-medium">{e.title}</td>
                    <td className="td">{e.course.subject.name} <span className="text-slate-400">· {e.course.classSection.name}</span></td>
                    <td className="td">{e.type === "INTERNAL" ? "Internal" : "Final"}</td><td className="td">{n}</td>
                    <td className="td">{avg === null ? "—" : `${avg}%`}</td><td className="td">{pass === null ? "—" : `${pass}%`}</td>
                    <td className="td"><Badge tone={e.resultsPublished ? "green" : "amber"}>{e.resultsPublished ? "Published" : "Draft"}</Badge></td>
                  </tr>
                );
              })}
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
