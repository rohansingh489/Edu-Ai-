import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Empty, Field, Flash, InfoAlert, PageHeader, Table, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createClassSection, createGradeLevel } from "@/app/actions/admin";
import { School } from "lucide-react";

export default async function AdminClasses({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { institutionId, institution } = await requireAdmin();
  const isCollege = institution.type === "COLLEGE";

  const [classes, grades, programs, years] = await Promise.all([
    prisma.classSection.findMany({
      where: { institutionId },
      include: {
        gradeLevel: true,
        program: true,
        academicYear: true,
        _count: { select: { students: true, courses: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.gradeLevel.findMany({ where: { institutionId }, orderBy: { sortOrder: "asc" } }),
    prisma.program.findMany({ where: { institutionId }, orderBy: { name: "asc" } }),
    prisma.academicYear.findMany({ where: { institutionId }, orderBy: { startDate: "desc" } }),
  ]);

  return (
    <>
      <PageHeader
        title={isCollege ? "Batches & Sections" : "Classes & Sections"}
        subtitle={isCollege
          ? "Manage college batches, semesters and course groups"
          : "Manage school grade levels and class sections"}
        icon={<School size={20} />}
      />
      <Flash sp={sp} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: forms */}
        <div className="space-y-4">
          {/* Grade level / Stream */}
          <form action={createGradeLevel} className="card space-y-3">
            <h2 className="font-bold text-navy-900">
              {isCollege ? "Add stream / specialisation" : "Add grade level"}
            </h2>
            <InfoAlert>
              {isCollege
                ? "e.g. Science, Commerce, Arts, BCA Year 1, B.Tech CSE"
                : "e.g. Class 10, Class 12, Std. 9"}
            </InfoAlert>
            <Field label={isCollege ? "Stream / Year name" : "Grade name"}>
              <input
                name="name"
                required
                placeholder={isCollege ? "e.g. B.Tech Year 1" : "e.g. Class 10"}
                className="input"
              />
            </Field>
            <Field label="Sort order">
              <input name="sortOrder" type="number" defaultValue={grades.length} min={0} className="input" />
            </Field>
            <SubmitButton>Add {isCollege ? "stream" : "grade"}</SubmitButton>
            {grades.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {grades.map((g) => (
                  <span key={g.id} className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {g.name}
                  </span>
                ))}
              </div>
            )}
          </form>

          {/* Class / Section form */}
          <form action={createClassSection} className="card space-y-3">
            <h2 className="font-bold text-navy-900">
              {isCollege ? "Add batch / section" : "Add class / section"}
            </h2>
            <Field label={isCollege ? "Batch / Section name" : "Section name"}>
              <input
                name="name"
                required
                placeholder={isCollege ? "e.g. BCA Sem 3 - A" : "e.g. Class 10-A"}
                className="input"
              />
            </Field>
            <Field label={isCollege ? "Stream / Year" : "Grade level"}>
              <select name="gradeLevelId" className="input">
                <option value="">— Select —</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
            <Field label={isCollege ? "Program / Course" : "Stream (optional)"}>
              <select name="programId" className="input">
                <option value="">— Select —</option>
                {programs.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
            <Field label="Academic year">
              <select name="academicYearId" className="input">
                <option value="">— Select —</option>
                {years.map((g) => <option key={g.id} value={g.id}>{g.name}{g.isCurrent ? " (Current)" : ""}</option>)}
              </select>
            </Field>
            <SubmitButton>Add {isCollege ? "batch" : "class"}</SubmitButton>
          </form>
        </div>

        {/* Right: table */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 font-bold text-navy-900">
            All {isCollege ? "batches" : "classes"} ({classes.length})
          </h2>
          {classes.length === 0 ? (
            <Empty icon={<School size={32} />}>
              No {isCollege ? "batches" : "classes"} yet. Add one on the left.
            </Empty>
          ) : (
            <Table head={[isCollege ? "Batch / Section" : "Class", isCollege ? "Stream / Year" : "Grade", "Program", "Year", "Students", "Subjects"]}>
              {classes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="td font-semibold text-slate-900">{c.name}</td>
                  <td className="td text-slate-500">{c.gradeLevel?.name ?? "—"}</td>
                  <td className="td text-slate-500">{c.program?.name ?? "—"}</td>
                  <td className="td">
                    {c.academicYear
                      ? <span className={c.academicYear.isCurrent ? "text-emerald-600 font-medium" : "text-slate-500"}>
                          {c.academicYear.name}
                        </span>
                      : "—"}
                  </td>
                  <td className="td">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {c._count.students}
                    </span>
                  </td>
                  <td className="td">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {c._count.courses}
                    </span>
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
