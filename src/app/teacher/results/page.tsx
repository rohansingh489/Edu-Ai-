import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { teacherCourses } from "@/lib/teacher";
import { Badge, Empty, Field, Flash, PageHeader, Table, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createExamTeacher, saveMarks } from "@/app/actions/teacher";
import { fmtDate } from "@/lib/utils";

export default async function TeacherResults({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { profile } = await requireTeacher();
  const courses = await teacherCourses(profile.id);
  const ids = courses.map((c) => c.id);
  const exams = await prisma.examination.findMany({
    where: { courseId: { in: ids } },
    include: { course: { include: { subject: true, classSection: true } }, _count: { select: { results: true } } },
    orderBy: { date: "desc" },
  });
  const selected = exams.find((e) => e.id === sp.exam);
  const enrolled = selected
    ? await prisma.enrollment.findMany({
        where: { courseId: selected.courseId },
        include: { student: { include: { user: { select: { name: true } }, results: { where: { examinationId: selected.id } } } } },
      })
    : [];
  return (
    <>
      <PageHeader title="Examinations & marks" subtitle="Create internal/final exams, enter marks (grades are calculated automatically) and publish results." />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card h-fit">
          <h2 className="mb-3 font-bold text-navy-900">New examination</h2>
          {courses.length === 0 ? <Empty>No subjects assigned.</Empty> : (
            <form action={createExamTeacher} className="space-y-3">
              <Field label="Subject"><select name="courseId" className="input">{courses.map((c) => <option key={c.id} value={c.id}>{c.subject.name} — {c.classSection.name}</option>)}</select></Field>
              <Field label="Title"><input name="title" required minLength={3} placeholder="Mid-term test" className="input" /></Field>
              <Field label="Type"><select name="type" className="input"><option value="INTERNAL">Internal assessment</option><option value="FINAL">Final examination</option></select></Field>
              <Field label="Date"><input type="date" name="date" required className="input" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Max marks"><input type="number" name="maxMarks" defaultValue={100} min={1} className="input" /></Field>
                <Field label="Pass marks"><input type="number" name="passMarks" defaultValue={35} min={0} className="input" /></Field>
              </div>
              <SubmitButton className="w-full">Create</SubmitButton>
            </form>
          )}
        </section>
        <section className="space-y-6 lg:col-span-2">
          {exams.length === 0 ? <Empty>No examinations yet.</Empty> : (
            <Table head={["Exam", "Subject", "Date", "Marks entered", "Status", ""]}>
              {exams.map((e) => (
                <tr key={e.id}>
                  <td className="td font-medium">{e.title}</td>
                  <td className="td">{e.course.subject.name} <span className="text-slate-400">· {e.course.classSection.name}</span></td>
                  <td className="td">{fmtDate(e.date)}</td>
                  <td className="td">{e._count.results}</td>
                  <td className="td"><Badge tone={e.resultsPublished ? "green" : "amber"}>{e.resultsPublished ? "Published" : "Draft"}</Badge></td>
                  <td className="td"><Link className="text-blue-600 hover:underline" href={`/teacher/results?exam=${e.id}`}>Enter marks</Link></td>
                </tr>
              ))}
            </Table>
          )}
          {selected && (
            <form action={saveMarks} className="card">
              <input type="hidden" name="examId" value={selected.id} />
              <h2 className="font-bold text-navy-900">{selected.title} — {selected.course.subject.name}</h2>
              <p className="mb-3 text-xs text-slate-500">Max {selected.maxMarks} · Pass {selected.passMarks}</p>
              <div className="divide-y divide-slate-100">
                {enrolled.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>{e.student.user.name}</span>
                    <span className="flex items-center gap-2">
                      {e.student.results[0] && <Badge tone={e.student.results[0].grade === "F" ? "red" : "green"}>{e.student.results[0].grade}</Badge>}
                      <input type="number" step="0.5" min={0} max={selected.maxMarks} name={`marks_${e.studentId}`} defaultValue={e.student.results[0]?.marks ?? ""} className="input w-24" />
                    </span>
                  </div>
                ))}
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" name="publish" defaultChecked={selected.resultsPublished} /> Publish results to students</label>
              <div className="mt-4"><SubmitButton>Save marks</SubmitButton></div>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
