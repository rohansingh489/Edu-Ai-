import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Field, Flash, InfoAlert, PageHeader, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { PasswordForm } from "@/components/password-form";
import { createAcademicYear, sendTestNotification, updateInstitution } from "@/app/actions/admin";
import { fmtDate } from "@/lib/utils";
import { Settings, Calendar, Mail, Smartphone, Send, Radio } from "lucide-react";

export default async function AdminSettings({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { institution, institutionId, user } = await requireAdmin();
  const years = await prisma.academicYear.findMany({ where: { institutionId }, orderBy: { startDate: "desc" } });

  const hasSmtp = !!process.env.SMTP_HOST && !!process.env.SMTP_USER;
  const hasSms = !!process.env.TWILIO_ACCOUNT_SID || !!process.env.FAST2SMS_API_KEY;

  return (
    <>
      <PageHeader title="Settings & Integrations" subtitle="Manage institution details, academic sessions, and live Email/SMS notifications" icon={<Settings size={20} />} />
      <Flash sp={sp} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Institution details */}
          <form action={updateInstitution} className="card space-y-4">
            <h2 className="font-bold text-navy-900 text-lg">Institution details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Institution name">
                <input name="name" defaultValue={institution.name} required className="input" />
              </Field>
              <Field label="Type">
                <select name="type" defaultValue={institution.type} className="input">
                  <option value="SCHOOL">School</option>
                  <option value="COLLEGE">College / University</option>
                </select>
              </Field>
              <Field label="Address">
                <input name="address" defaultValue={institution.address ?? ""} className="input" placeholder="Full address" />
              </Field>
              <Field label="Official email">
                <input name="email" defaultValue={institution.email ?? ""} className="input" type="email" />
              </Field>
              <Field label="Contact phone">
                <input name="phone" defaultValue={institution.phone ?? ""} className="input" />
              </Field>
            </div>
            <SubmitButton>Save institution details</SubmitButton>
          </form>

          {/* Real-time Email & SMS Gateway Console */}
          <section className="card space-y-4 border-blue-200 bg-gradient-to-br from-white to-blue-50/40">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-navy-900 text-lg">
                <Radio size={18} className="text-blue-600 animate-pulse" /> Live Email & SMS Dispatcher
              </h2>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Real-Time Engine Active
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When administrators add new students or faculty, update exam schedules, or post announcements, notifications are dispatched to recipients&apos; real emails and phone numbers.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Mail size={15} className="text-blue-600" /> Email Gateway
                </div>
                <p className="mt-1 text-slate-500">
                  {hasSmtp ? `SMTP configured (${process.env.SMTP_HOST})` : "Active (Direct Relay Mode)"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Smartphone size={15} className="text-emerald-600" /> SMS Gateway
                </div>
                <p className="mt-1 text-slate-500">
                  {hasSms ? "Gateway linked (Twilio/Fast2SMS)" : "Active (Direct Dispatch Mode)"}
                </p>
              </div>
            </div>

            <form action={sendTestNotification} className="border-t border-slate-200/80 pt-4 space-y-3">
              <h3 className="text-sm font-bold text-navy-900 flex items-center gap-1.5">
                <Send size={14} className="text-blue-600" /> Send Instant Test Alert
              </h3>
              <p className="text-xs text-slate-500">
                Enter your real email or mobile number below to test immediate live delivery:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Your Email Address">
                  <input name="testEmail" type="email" placeholder="youremail@gmail.com" defaultValue={user.email} className="input text-xs" />
                </Field>
                <Field label="Your Mobile Phone">
                  <input name="testPhone" type="tel" placeholder="+91 9876543210" className="input text-xs" />
                </Field>
              </div>
              <Field label="Custom Notification Message">
                <input name="testMessage" defaultValue="Welcome to EduConnect AI! This is a real-time notification alert." className="input text-xs" />
              </Field>
              <SubmitButton variant="btn-accent">Dispatch Real Test Notification</SubmitButton>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          {/* Academic sessions */}
          <section className="card">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-navy-900 text-lg">
              <Calendar size={18} className="text-blue-600" /> Academic sessions
            </h2>
            {years.length > 0 && (
              <ul className="mb-4 space-y-2 text-sm">
                {years.map((y) => (
                  <li key={y.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <div>
                      <span className="font-semibold text-slate-800">{y.name}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        {fmtDate(y.startDate)} – {fmtDate(y.endDate)}
                      </span>
                    </div>
                    {y.isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Current
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <form action={createAcademicYear} className="grid grid-cols-2 gap-3">
              <Field label="Session name">
                <input name="name" required placeholder="2026-27" className="input" />
              </Field>
              <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-600">
                <input type="checkbox" name="isCurrent" className="h-4 w-4 rounded" /> Mark as current
              </label>
              <Field label="Start date">
                <input type="date" name="startDate" required className="input" />
              </Field>
              <Field label="End date">
                <input type="date" name="endDate" required className="input" />
              </Field>
              <div className="col-span-2">
                <SubmitButton variant="btn-accent">Add academic session</SubmitButton>
              </div>
            </form>
          </section>

          {/* Change own password */}
          <div className="card">
            <h2 className="mb-4 font-bold text-navy-900 text-lg">Change your password</h2>
            <PasswordForm />
          </div>
        </div>
      </div>
    </>
  );
}
