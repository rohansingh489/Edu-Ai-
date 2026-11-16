import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Badge, Empty, Field, Flash, InfoAlert, PageHeader, Table, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createStudent, setUserActive } from "@/app/actions/admin";
import { GraduationCap } from "lucide-react";

export default async function AdminStudents({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const { institutionId, institution } = await requireAdmin();
  const isCollege = institution.type === "COLLEGE";

  const [students, classes, programs] = await Promise.all([
    prisma.user.findMany({
      where: {
        institutionId, role: "STUDENT",
        ...(q ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { loginId: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: { studentProfile: { include: { classSection: true, program: true } } },
      orderBy: { name: "asc" },
      take: 300,
    }),
    prisma.classSection.findMany({ where: { institutionId }, orderBy: { name: "asc" } }),
    prisma.program.findMany({ where: { institutionId }, orderBy: { name: "asc" } }),
  ]);

  // Calculate next suggested Student ID (e.g., STU2026007)
  const currentYear = new Date().getFullYear();
  let nextStuNum = 1;
  const prefixRegex = new RegExp(`^STU${currentYear}(\\d+)$`, "i");
  for (const s of students) {
    const match = s.loginId.match(prefixRegex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= nextStuNum) nextStuNum = num + 1;
    }
  }
  const suggestedStudentId = `STU${currentYear}${String(nextStuNum).padStart(3, "0")}`;

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${students.length} enrolled · Add or manage student accounts`}
        icon={<GraduationCap size={20} />}
      />
      <Flash sp={sp} />

      {/* Add student form */}
      <details className="card mb-6 group">
        <summary className="cursor-pointer select-none font-bold text-navy-900 flex items-center gap-2 list-none">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600 text-white text-sm font-bold">+</span>
          Add new student
        </summary>

        <div className="mt-4">
          <InfoAlert>
            The student will log in at <strong>/login/student</strong> using their <strong>Email</strong> or <strong>Student ID</strong>. Suggested next ID: <strong>{suggestedStudentId}</strong>.
          </InfoAlert>

          <form action={createStudent} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Identity */}
            <Field label="Full name">
              <input name="name" required className="input" placeholder="e.g. Rahul Sharma" />
            </Field>
            <Field label="Student ID (login ID)" hint={`Must be unique. Suggested: ${suggestedStudentId}`}>
              <input name="loginId" required minLength={3} defaultValue={suggestedStudentId} className="input font-mono font-semibold text-navy-900" />
            </Field>
            <Field label="Email address (login)" hint="Student can also log in with email">
              <input name="email" type="email" required className="input" placeholder="student@gmail.com" />
            </Field>
            <Field label="Login password" hint="Minimum 8 characters">
              <input name="password" type="password" required minLength={8} className="input" placeholder="Set a strong password" autoComplete="new-password" />
            </Field>

            {/* Academic placement */}
            {isCollege ? (
              <>
                <Field label="Program / Course (e.g. BCA, B.Sc)">
                  <select name="programId" className="input">
                    <option value="">— Select program —</option>
                    {programs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Class / Section / Batch">
                  <select name="classSectionId" className="input">
                    <option value="">— Select batch —</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Semester">
                  <input name="semester" type="number" min={1} max={12} className="input" placeholder="e.g. 3" />
                </Field>
                <Field label="Roll number">
                  <input name="rollNo" className="input" placeholder="e.g. 230101" />
                </Field>
              </>
            ) : (
              <>
                <Field label="Class / Section">
                  <select name="classSectionId" className="input">
                    <option value="">— Select class —</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Program / Stream (optional)">
                  <select name="programId" className="input">
                    <option value="">— Select stream —</option>
                    {programs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Roll number">
                  <input name="rollNo" className="input" />
                </Field>
              </>
            )}

            {/* Personal */}
            <Field label="Guardian / Parent name">
              <input name="guardianName" className="input" placeholder="Parent's full name" />
            </Field>
            <Field label="Contact phone">
              <input name="phone" className="input" placeholder="+91 9XXXXXXXXX" />
            </Field>
            <Field label="Total fees (₹)">
              <input name="feeTotal" type="number" min={0} defaultValue={0} className="input" />
            </Field>

            <div className="sm:col-span-2 lg:col-span-3 flex">
              <SubmitButton>Create student account</SubmitButton>
            </div>
          </form>
        </div>
      </details>

      {/* Search */}
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search by name, ID or email…" className="input max-w-sm" />
        <button type="submit" className="btn-outline">Search</button>
        {q && <Link href="/admin/students" className="btn-ghost">Clear</Link>}
      </form>

      {/* Table */}
      {students.length === 0 ? (
        <Empty icon={<GraduationCap size={32} />}>
          {q ? `No students matching "${q}".` : "No students yet. Add one above."}
        </Empty>
      ) : (
        <Table head={["Student", "ID", isCollege ? "Program" : "Stream", "Class / Batch", "Fees due", "Status", ""]}>
          {students.map((u) => {
            const p = u.studentProfile;
            const feesDue = (p?.feeTotal ?? 0) - (p?.feePaid ?? 0);
            return (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="td">
                  <p className="font-semibold text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>
                <td className="td font-mono text-xs text-slate-500">{u.loginId}</td>
                <td className="td">{p?.program?.name ?? "—"}</td>
                <td className="td">{p?.classSection?.name ?? "—"}{p?.semester ? ` · Sem ${p.semester}` : ""}</td>
                <td className="td">
                  <span className={feesDue > 0 ? "font-semibold text-red-600" : "text-slate-500"}>
                    ₹{feesDue.toLocaleString("en-IN")}
                  </span>
                </td>
                <td className="td">
                  <Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="td whitespace-nowrap">
                  <Link href={`/admin/students/${u.id}`} className="mr-3 text-sm font-medium text-blue-600 hover:underline">
                    View / Edit
                  </Link>
                  <form action={setUserActive} className="inline">
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="active" value={String(!u.isActive)} />
                    <input type="hidden" name="back" value="/admin/students" />
                    <SubmitButton variant="btn-outline" className="btn-sm" confirm={u.isActive ? "Deactivate this student?" : undefined}>
                      {u.isActive ? "Deactivate" : "Activate"}
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
