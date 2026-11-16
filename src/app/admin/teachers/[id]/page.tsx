import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Badge, Field, Flash, InfoAlert, PageHeader, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { adminResetPassword, setUserActive, updateTeacher } from "@/app/actions/admin";
import { Users, BookOpen, KeyRound } from "lucide-react";

export default async function AdminTeacherDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { institutionId } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const u = await prisma.user.findFirst({
    where: { id, institutionId, role: "TEACHER" },
    include: {
      teacherProfile: {
        include: {
          teachingAssignments: {
            include: { course: { include: { subject: true, classSection: true } } },
          },
        },
      },
    },
  });
  if (!u?.teacherProfile) notFound();
  const p = u.teacherProfile;
  const departments = await prisma.department.findMany({ where: { institutionId }, orderBy: { name: "asc" } });

  return (
    <>
      <Link href="/admin/teachers" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
        ← Back to Teachers
      </Link>
      <PageHeader
        title={u.name}
        subtitle={`ID: ${u.loginId} · ${u.email}`}
        icon={<Users size={20} />}
        action={<Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Inactive"}</Badge>}
      />
      <Flash sp={sp} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile form */}
        <form action={updateTeacher} className="card space-y-4">
          <h2 className="flex items-center gap-2 font-bold text-navy-900 text-lg">
            <Users size={18} className="text-blue-600" /> Faculty profile
          </h2>
          <input type="hidden" name="userId" value={u.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name"><input name="name" defaultValue={u.name} required className="input" /></Field>
            <Field label="Email"><input name="email" type="email" defaultValue={u.email} required className="input" /></Field>
            <Field label="Department">
              <select name="departmentId" defaultValue={p.departmentId ?? ""} className="input">
                <option value="">— None —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Designation">
              <input name="designation" defaultValue={p.designation ?? ""} className="input" placeholder="e.g. Assistant Professor" />
            </Field>
            <Field label="Phone">
              <input name="phone" defaultValue={p.phone ?? ""} className="input" />
            </Field>
          </div>
          <SubmitButton>Save changes</SubmitButton>
        </form>

        <div className="space-y-5">
          {/* Assigned subjects */}
          <section className="card">
            <h2 className="flex items-center gap-2 font-bold text-navy-900 mb-3">
              <BookOpen size={18} className="text-emerald-600" /> Assigned subjects
            </h2>
            {p.teachingAssignments.length === 0 ? (
              <p className="text-sm text-slate-500">No subjects assigned yet. Assign from the <Link href="/admin/subjects" className="text-blue-600 hover:underline">Subjects page</Link>.</p>
            ) : (
              <ul className="divide-y divide-slate-50 text-sm">
                {p.teachingAssignments.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-slate-800">{t.course.subject.name}</p>
                      <p className="text-xs text-slate-500">{t.course.classSection.name}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Reset password */}
          <form action={adminResetPassword} className="card">
            <h2 className="flex items-center gap-2 font-bold text-navy-900 mb-2">
              <KeyRound size={18} className="text-violet-600" /> Reset password
            </h2>
            <InfoAlert>
              Teacher logs in at <strong>/login/teacher</strong> using <strong>{u.email}</strong> or ID <strong>{u.loginId}</strong>.
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
            <input type="hidden" name="back" value={`/admin/teachers/${u.id}`} />
            <p className="mb-3 text-sm text-slate-500">
              {u.isActive ? "Deactivating blocks this teacher from logging in." : "Reactivating restores login access."}
            </p>
            <SubmitButton
              variant={u.isActive ? "btn-danger" : "btn-success"}
              confirm={u.isActive ? "Deactivate this teacher account?" : undefined}
            >
              {u.isActive ? "Deactivate account" : "Reactivate account"}
            </SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}
