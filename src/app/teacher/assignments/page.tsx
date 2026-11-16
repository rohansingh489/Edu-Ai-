import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { teacherCourses } from "@/lib/teacher";
import { Empty, Field, Flash, PageHeader, Table, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createAssignment } from "@/app/actions/teacher";
import { fmtDate } from "@/lib/utils";

export default async function TeacherAssignments({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { profile } = await requireTeacher();
  const [courses, list] = await Promise.all([
    teacherCourses(profile.id),
    prisma.assignment.findMany({
      where: { teacherId: profile.id },
      include: { course: { include: { subject: true, classSection: true, _count: { select: { enrollments: true } } } }, _count: { select: { submissions: true } } },
      orderBy: { dueDate: "desc" },
    }),
  ]);
  return (
    <>
      <PageHeader title="Assignments" subtitle="Create assignments and review student submissions." />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card h-fit">
          <h2 className="mb-3 font-bold text-navy-900">New assignment</h2>
          {courses.length === 0 ? <Empty>No subjects assigned.</Empty> : (
            <form action={createAssignment} className="space-y-3">
              <Field label="Subject"><select name="courseId" className="input">{courses.map((c) => <option key={c.id} value={c.id}>{c.subject.name} — {c.classSection.name}</option>)}</select></Field>
              <Field label="Title"><input name="title" required minLength={3} className="input" /></Field>
              <Field label="Instructions"><textarea name="description" required minLength={5} rows={4} className="input" /></Field>
              <Field label="Due date"><input type="datetime-local" name="dueDate" required className="input" /></Field>
              <Field label="Max marks"><input type="number" name="maxMarks" defaultValue={10} min={1} className="input" /></Field>
              <SubmitButton className="w-full">Create & notify students</SubmitButton>
            </form>
          )}
        </section>
        <section className="lg:col-span-2">
          {list.length === 0 ? <Empty>No assignments yet.</Empty> : (
            <Table head={["Title", "Subject", "Due", "Submitted", ""]}>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="td font-medium">{a.title}</td>
                  <td className="td">{a.course.subject.name} <span className="text-slate-400">· {a.course.classSection.name}</span></td>
                  <td className="td">{fmtDate(a.dueDate)}</td>
                  <td className="td">{a._count.submissions}/{a.course._count.enrollments}</td>
                  <td className="td"><Link href={`/teacher/assignments/${a.id}`} className="text-blue-600 hover:underline">Review</Link></td>
                </tr>
              ))}
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
