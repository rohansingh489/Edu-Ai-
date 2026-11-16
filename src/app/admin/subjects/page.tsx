import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Empty, Field, Flash, PageHeader, Table, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { assignTeacher, createCourse, createSubject } from "@/app/actions/admin";
import { BookOpen } from "lucide-react";

export default async function AdminSubjects({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { institutionId, institution } = await requireAdmin();
  const isCollege = institution.type === "COLLEGE";

  const [subjects, departments, classes, teachers, courses] = await Promise.all([
    prisma.subject.findMany({ where: { institutionId }, include: { department: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { institutionId }, orderBy: { name: "asc" } }),
    prisma.classSection.findMany({ where: { institutionId }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { institutionId, role: "TEACHER", isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.course.findMany({
      where: { institutionId },
      include: {
        subject: true,
        classSection: true,
        teachingAssignments: { include: { teacher: { include: { user: { select: { id: true, name: true } } } } } },
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ classSection: { name: "asc" } }, { subject: { name: "asc" } }],
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Subjects & Courses"
        subtitle={`Create subjects, offer them to ${isCollege ? "batches" : "classes"} and assign faculty`}
        icon={<BookOpen size={20} />}
      />
      <Flash sp={sp} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Forms */}
        <div className="space-y-4">
          {/* Add subject */}
          <form action={createSubject} className="card space-y-3">
            <h2 className="font-bold text-navy-900">Add subject</h2>
            <Field label="Subject name">
              <input name="name" required className="input" placeholder={isCollege ? "e.g. Data Structures" : "e.g. Mathematics"} />
            </Field>
            <Field label="Subject code">
              <input name="code" className="input" placeholder="e.g. CS301" />
            </Field>
            <Field label="Department">
              <select name="departmentId" className="input">
                <option value="">— Select department —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <SubmitButton>Add subject</SubmitButton>
            {subjects.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {subjects.map((s) => (
                  <span key={s.id} className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </form>

          {/* Offer to class */}
          <form action={createCourse} className="card space-y-3">
            <h2 className="font-bold text-navy-900">Offer subject to {isCollege ? "batch" : "class"}</h2>
            <Field label="Subject">
              <select name="subjectId" required className="input">
                <option value="">— Select subject —</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.department ? ` (${s.department.name})` : ""}</option>)}
              </select>
            </Field>
            <Field label={isCollege ? "Batch / Section" : "Class / Section"}>
              <select name="classSectionId" required className="input">
                <option value="">— Select {isCollege ? "batch" : "class"} —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Assign faculty">
              <select name="teacherUserId" className="input">
                <option value="">— Assign later —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Semester (if applicable)">
              <input name="semester" type="number" min={1} max={12} className="input" placeholder="e.g. 3" />
            </Field>
            <SubmitButton>Offer & enrol {isCollege ? "batch" : "class"}</SubmitButton>
          </form>
        </div>

        {/* Table */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 font-bold text-navy-900">Offered subjects ({courses.length})</h2>
          {courses.length === 0 ? (
            <Empty icon={<BookOpen size={28} />}>
              No subjects offered yet. Use the form on the left.
            </Empty>
          ) : (
            <Table head={[isCollege ? "Batch" : "Class", "Subject", "Students", "Faculty", "Change faculty"]}>
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="td font-medium text-slate-700">{c.classSection.name}</td>
                  <td className="td font-semibold text-slate-900">{c.subject.name}</td>
                  <td className="td">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {c._count.enrollments}
                    </span>
                  </td>
                  <td className="td">
                    {c.teachingAssignments[0]?.teacher.user.name
                      ? <span className="text-slate-800">{c.teachingAssignments[0].teacher.user.name}</span>
                      : <span className="text-amber-600 font-medium">⚠ Unassigned</span>
                    }
                  </td>
                  <td className="td">
                    <form action={assignTeacher} className="flex gap-2">
                      <input type="hidden" name="courseId" value={c.id} />
                      <select
                        name="teacherUserId"
                        defaultValue={c.teachingAssignments[0]?.teacher.user.id}
                        className="input py-1 text-xs"
                      >
                        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <SubmitButton variant="btn-outline" className="btn-sm whitespace-nowrap">Assign</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
