import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Empty, Field, Flash, PageHeader, Table, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createDepartment, createProgram } from "@/app/actions/admin";
import { Layers } from "lucide-react";

export default async function AdminDepartments({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { institutionId, institution } = await requireAdmin();
  const isCollege = institution.type === "COLLEGE";

  const [departments, programs] = await Promise.all([
    prisma.department.findMany({
      where: { institutionId },
      include: { _count: { select: { teachers: true, programs: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.program.findMany({
      where: { institutionId },
      include: { department: true, _count: { select: { students: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Departments & Programs"
        subtitle={isCollege
          ? "Manage college departments, branches and courses of study"
          : "Manage school departments and subject streams"}
        icon={<Layers size={20} />}
      />
      <Flash sp={sp} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Departments */}
        <section className="space-y-4">
          <form action={createDepartment} className="card space-y-3">
            <h2 className="font-bold text-navy-900">Add department</h2>
            <p className="text-xs text-slate-500">
              {isCollege
                ? "e.g. Computer Science, Electronics, Management, Arts & Humanities"
                : "e.g. Science, Commerce, Mathematics, Languages"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Department name">
                <input name="name" required className="input" placeholder={isCollege ? "e.g. Computer Science" : "e.g. Science"} />
              </Field>
              <Field label="Short code">
                <input name="code" className="input" placeholder="e.g. CS" />
              </Field>
            </div>
            <SubmitButton>Add department</SubmitButton>
          </form>

          {departments.length === 0 ? (
            <Empty icon={<Layers size={28} />}>No departments yet.</Empty>
          ) : (
            <Table head={["Department", "Code", "Faculty", "Programs"]}>
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="td font-semibold text-slate-900">{d.name}</td>
                  <td className="td">
                    {d.code
                      ? <span className="rounded-lg bg-navy-50 px-2 py-0.5 text-xs font-bold text-navy-700">{d.code}</span>
                      : "—"}
                  </td>
                  <td className="td">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {d._count.teachers} faculty
                    </span>
                  </td>
                  <td className="td text-slate-500">{d._count.programs}</td>
                </tr>
              ))}
            </Table>
          )}
        </section>

        {/* Programs / Courses */}
        <section className="space-y-4">
          <form action={createProgram} className="card space-y-3">
            <h2 className="font-bold text-navy-900">
              {isCollege ? "Add program / course" : "Add stream / elective"}
            </h2>
            <p className="text-xs text-slate-500">
              {isCollege
                ? "e.g. BCA, B.Sc Computer Science, B.Tech CSE, MBA, MCA"
                : "e.g. Science (PCM), Commerce, Arts, Vocational IT"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={isCollege ? "Program name" : "Stream name"}>
                <input name="name" required placeholder={isCollege ? "e.g. BCA" : "e.g. Science (PCM)"} className="input" />
              </Field>
              <Field label="Duration (years)">
                <input name="durationYears" type="number" defaultValue={isCollege ? 3 : 2} min={1} max={8} className="input" />
              </Field>
            </div>
            <Field label="Department">
              <select name="departmentId" className="input">
                <option value="">— Select department —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <SubmitButton>Add {isCollege ? "program" : "stream"}</SubmitButton>
          </form>

          {programs.length === 0 ? (
            <Empty>No {isCollege ? "programs" : "streams"} yet.</Empty>
          ) : (
            <Table head={["Program / Stream", "Dept.", "Duration", "Students"]}>
              {programs.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="td font-semibold text-slate-900">{p.name}</td>
                  <td className="td text-slate-500">{p.department?.name ?? "—"}</td>
                  <td className="td text-xs text-slate-500">{p.durationYears} yr{p.durationYears !== 1 ? "s" : ""}</td>
                  <td className="td">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {p._count.students}
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
