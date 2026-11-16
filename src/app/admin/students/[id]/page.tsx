import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Badge, Field, Flash, InfoAlert, PageHeader, Progress, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { adminResetPassword, setUserActive, updateFees, updateStudent } from "@/app/actions/admin";
import { attendanceByCourse, overallAttendance } from "@/lib/helpers";
import { fmtDate } from "@/lib/utils";
import { GraduationCap, KeyRound, Activity, Wallet } from "lucide-react";

export default async function AdminStudentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { institutionId, institution } = await requireAdmin();
  const isCollege = institution.type === "COLLEGE";
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const u = await prisma.user.findFirst({ where: { id, institutionId, role: "STUDENT" }, include: { studentProfile: true } });
  if (!u?.studentProfile) notFound();
  const p = u.studentProfile;

  const [classes, programs, att] = await Promise.all([
    prisma.classSection.findMany({ where: { institutionId }, orderBy: { name: "asc" } }),
    prisma.program.findMany({ where: { institutionId }, orderBy: { name: "asc" } }),
    attendanceByCourse(p.id),
  ]);
  const overall = overallAttendance(att);

  return (
    <>
      <Link href="/admin/students" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
        ← Back to Students
      </Link>
      <PageHeader
        title={u.name}
        subtitle={`ID: ${u.loginId} · Email: ${u.email} · Joined ${fmtDate(u.createdAt)}`}
        icon={<GraduationCap size={20} />}
        action={<Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Inactive"}</Badge>}
      />
      <Flash sp={sp} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile edit */}
        <form action={updateStudent} className="card space-y-4">
          <h2 className="flex items-center gap-2 font-bold text-navy-900 text-lg">
            <GraduationCap size={18} className="text-blue-600" /> Student profile
          </h2>
          <input type="hidden" name="userId" value={u.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name"><input name="name" defaultValue={u.name} required className="input" /></Field>
            <Field label="Email address"><input name="email" type="email" defaultValue={u.email} required className="input" /></Field>
            {isCollege ? (
              <>
                <Field label="Program / Course">
                  <select name="programId" defaultValue={p.programId ?? ""} className="input">
                    <option value="">— None —</option>
                    {programs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Class / Batch">
                  <select name="classSectionId" defaultValue={p.classSectionId ?? ""} className="input">
                    <option value="">— None —</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Semester"><input name="semester" type="number" defaultValue={p.semester ?? ""} min={1} max={12} className="input" /></Field>
              </>
            ) : (
              <>
                <Field label="Class / Section">
                  <select name="classSectionId" defaultValue={p.classSectionId ?? ""} className="input">
                    <option value="">— None —</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Stream">
                  <select name="programId" defaultValue={p.programId ?? ""} className="input">
                    <option value="">— None —</option>
                    {programs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </>
            )}
            <Field label="Roll number"><input name="rollNo" defaultValue={p.rollNo ?? ""} className="input" /></Field>
            <Field label="Guardian name"><input name="guardianName" defaultValue={p.guardianName ?? ""} className="input" /></Field>
            <Field label="Phone"><input name="phone" defaultValue={p.phone ?? ""} className="input" /></Field>
          </div>
          <SubmitButton>Save changes</SubmitButton>
        </form>

        <div className="space-y-5">
          {/* Attendance */}
          <section className="card">
            <h2 className="flex items-center gap-2 font-bold text-navy-900 mb-3">
              <Activity size={18} className="text-emerald-600" /> Attendance
            </h2>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-3xl font-extrabold ${overall.pct >= 75 ? "text-emerald-600" : overall.pct >= 60 ? "text-amber-500" : "text-red-600"}`}>
                {overall.total ? `${overall.pct}%` : "—"}
              </span>
              <span className="text-sm text-slate-500">
                {overall.total ? `${overall.present}/${overall.total} classes` : "No records yet"}
              </span>
              <Badge tone={overall.pct >= 75 || !overall.total ? "green" : overall.pct >= 60 ? "amber" : "red"}>
                {overall.pct >= 75 ? "Good" : overall.pct >= 60 ? "Low" : "Critical"}
              </Badge>
            </div>
            {att.map((a) => (
              <div key={a.courseId} className="mb-2">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{a.subject}</span>
                  <span className="text-slate-500">{a.pct}% ({a.present}/{a.total})</span>
                </div>
                <Progress value={a.pct} />
              </div>
            ))}
          </section>

          {/* Fee record */}
          <form action={updateFees} className="card">
            <h2 className="flex items-center gap-2 font-bold text-navy-900 mb-3">
              <Wallet size={18} className="text-amber-500" /> Fee record
            </h2>
            <input type="hidden" name="userId" value={u.id} />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Total fees (₹)"><input name="feeTotal" type="number" min={0} defaultValue={p.feeTotal} className="input" /></Field>
              <Field label="Amount paid (₹)"><input name="feePaid" type="number" min={0} defaultValue={p.feePaid} className="input" /></Field>
            </div>
            <div className="mb-3">
              <Progress value={p.feeTotal > 0 ? Math.round((p.feePaid / p.feeTotal) * 100) : 0} />
              <p className="mt-1 text-xs text-slate-500">
                ₹{p.feePaid.toLocaleString("en-IN")} paid · ₹{(p.feeTotal - p.feePaid).toLocaleString("en-IN")} outstanding
              </p>
            </div>
            <SubmitButton variant="btn-accent">Update fees</SubmitButton>
          </form>

          {/* Reset password */}
          <form action={adminResetPassword} className="card">
            <h2 className="flex items-center gap-2 font-bold text-navy-900 mb-2">
              <KeyRound size={18} className="text-violet-600" /> Reset password
            </h2>
            <InfoAlert>
              Student logs in at <strong>/login/student</strong> using <strong>{u.email}</strong> or ID <strong>{u.loginId}</strong>.
            </InfoAlert>
            <input type="hidden" name="userId" value={u.id} />
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <Field label="New password (min 8 chars)">
                <input name="password" type="password" minLength={8} required className="input" autoComplete="new-password" placeholder="Enter new password" />
              </Field>
              <SubmitButton variant="btn-outline">Reset password</SubmitButton>
            </div>
          </form>

          {/* Activate/Deactivate */}
          <form action={setUserActive} className="card">
            <input type="hidden" name="userId" value={u.id} />
            <input type="hidden" name="active" value={String(!u.isActive)} />
            <input type="hidden" name="back" value={`/admin/students/${u.id}`} />
            <p className="mb-3 text-sm text-slate-500">
              {u.isActive ? "Deactivating blocks this student from logging in." : "Reactivating restores login access."}
            </p>
            <SubmitButton
              variant={u.isActive ? "btn-danger" : "btn-success"}
              confirm={u.isActive ? "Deactivate this student account? They will not be able to log in." : undefined}
            >
              {u.isActive ? "Deactivate account" : "Reactivate account"}
            </SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}
