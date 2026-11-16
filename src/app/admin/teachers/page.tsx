import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Badge, Empty, Field, Flash, InfoAlert, PageHeader, Table, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createTeacher, setUserActive } from "@/app/actions/admin";
import { Users } from "lucide-react";

export default async function AdminTeachers({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const { institutionId } = await requireAdmin();
  const [teachers, departments] = await Promise.all([
    prisma.user.findMany({
      where: {
        institutionId, role: "TEACHER",
        ...(q ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { loginId: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: { teacherProfile: { include: { department: true, _count: { select: { teachingAssignments: true } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ where: { institutionId }, orderBy: { name: "asc" } }),
  ]);

  // Calculate next suggested Employee ID (e.g., EMP1003)
  let nextEmpNum = 1001;
  for (const t of teachers) {
    const match = t.loginId.match(/^EMP(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= nextEmpNum) nextEmpNum = num + 1;
    }
  }
  const suggestedEmpId = `EMP${nextEmpNum}`;

  return (
    <>
      <PageHeader
        title="Faculty / Teachers"
        subtitle={`${teachers.length} faculty members · Add and manage accounts`}
        icon={<Users size={20} />}
      />
      <Flash sp={sp} />

      {/* Add teacher form */}
      <details className="card mb-6">
        <summary className="cursor-pointer select-none font-bold text-navy-900 flex items-center gap-2 list-none">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600 text-white text-sm font-bold">+</span>
          Add new teacher / faculty
        </summary>

        <div className="mt-4">
          <InfoAlert>
            The teacher will log in at <strong>/login/teacher</strong> using their <strong>Email</strong> or <strong>Employee ID</strong>. Suggested next ID: <strong>{suggestedEmpId}</strong>.
          </InfoAlert>

          <form action={createTeacher} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full name">
              <input name="name" required className="input" placeholder="e.g. Dr. Priya Sharma" />
            </Field>
            <Field label="Employee ID (login ID)" hint={`Must be unique. Suggested: ${suggestedEmpId}`}>
              <input name="loginId" required minLength={3} defaultValue={suggestedEmpId} className="input font-mono font-semibold text-navy-900" />
            </Field>
            <Field label="Email address (login)" hint="Must be a unique email">
              <input name="email" type="email" required className="input" placeholder="teacher@college.edu" />
            </Field>
            <Field label="Login password" hint="Minimum 8 characters">
              <input name="password" type="password" required minLength={8} className="input" placeholder="Set a strong password" autoComplete="new-password" />
            </Field>
            <Field label="Department">
              <select name="departmentId" className="input">
                <option value="">— Select department —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Designation / Title">
              <input name="designation" className="input" placeholder="e.g. Assistant Professor, HOD" />
            </Field>
            <Field label="Contact phone">
              <input name="phone" className="input" placeholder="+91 9XXXXXXXXX" />
            </Field>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <SubmitButton>Create teacher account</SubmitButton>
            </div>
          </form>
        </div>
      </details>

      {/* Search */}
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search by name, ID or email…" className="input max-w-sm" />
        <button type="submit" className="btn-outline">Search</button>
        {q && <Link href="/admin/teachers" className="btn-ghost">Clear</Link>}
      </form>

      {/* Table */}
      {teachers.length === 0 ? (
        <Empty icon={<Users size={32} />}>
          {q ? `No faculty matching "${q}".` : "No teachers yet. Add one above."}
        </Empty>
      ) : (
        <Table head={["Teacher", "Employee ID", "Department", "Designation", "Subjects", "Status", ""]}>
          {teachers.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
              <td className="td">
                <p className="font-semibold text-slate-900">{u.name}</p>
                <p className="text-xs text-slate-400">{u.email}</p>
              </td>
              <td className="td font-mono text-xs text-slate-500">{u.loginId}</td>
              <td className="td">{u.teacherProfile?.department?.name ?? "—"}</td>
              <td className="td text-slate-500">{u.teacherProfile?.designation ?? "—"}</td>
              <td className="td">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {u.teacherProfile?._count.teachingAssignments ?? 0} subjects
                </span>
              </td>
              <td className="td">
                <Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Inactive"}</Badge>
              </td>
              <td className="td whitespace-nowrap">
                <Link href={`/admin/teachers/${u.id}`} className="mr-3 text-sm font-medium text-blue-600 hover:underline">
                  View / Edit
                </Link>
                <form action={setUserActive} className="inline">
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="active" value={String(!u.isActive)} />
                  <input type="hidden" name="back" value="/admin/teachers" />
                  <SubmitButton variant="btn-outline" className="btn-sm" confirm={u.isActive ? "Deactivate this teacher?" : undefined}>
                    {u.isActive ? "Deactivate" : "Activate"}
                  </SubmitButton>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
