import Link from "next/link";
import { Building2, GraduationCap, Users, School, TrendingUp, AlertCircle, BookOpen, CalendarCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Badge, Empty, Flash, InfoAlert, PageHeader, StatCard, statusTone, type SP } from "@/components/ui";
import { COMPLAINT_LABEL, fmtDate } from "@/lib/utils";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { institutionId, institution, user } = await requireAdmin();

  const [students, teachers, departments, classes, subjects, complaints, fees, exams, announcements] = await Promise.all([
    prisma.user.count({ where: { institutionId, role: "STUDENT", isActive: true } }),
    prisma.user.count({ where: { institutionId, role: "TEACHER", isActive: true } }),
    prisma.department.count({ where: { institutionId } }),
    prisma.classSection.count({ where: { institutionId } }),
    prisma.subject.count({ where: { institutionId } }),
    prisma.complaint.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { student: { select: { name: true } } },
    }),
    prisma.studentProfile.aggregate({ where: { institutionId }, _sum: { feeTotal: true, feePaid: true } }),
    prisma.examination.findMany({
      where: { institutionId, date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 5,
      include: { course: { include: { subject: true, classSection: true } } },
    }),
    prisma.announcement.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const due = (fees._sum.feeTotal ?? 0) - (fees._sum.feePaid ?? 0);
  const feeCollected = fees._sum.feePaid ?? 0;
  const feeTotal = fees._sum.feeTotal ?? 0;
  const feePct = feeTotal > 0 ? Math.round((feeCollected / feeTotal) * 100) : 0;
  const pendingComplaints = complaints.filter(c => c.status === "PENDING").length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]} 👋`}
        subtitle={`${institution.name} · ${institution.type === "COLLEGE" ? "College" : "School"} · ${institution.code}`}
      />
      <Flash sp={sp} />

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total students"
          value={students}
          hint="Active enrollments"
          tone="navy"
          icon={<GraduationCap size={18} />}
          href="/admin/students"
        />
        <StatCard
          label="Faculty members"
          value={teachers}
          hint="Active teachers"
          tone="blue"
          icon={<Users size={18} />}
          href="/admin/teachers"
        />
        <StatCard
          label="Departments"
          value={departments}
          hint={`${subjects} subjects total`}
          tone="violet"
          icon={<Building2 size={18} />}
          href="/admin/departments"
        />
        <StatCard
          label="Classes / Batches"
          value={classes}
          hint="Active sections"
          tone="green"
          icon={<School size={18} />}
          href="/admin/classes"
        />
      </div>

      {/* Fee + complaints summary */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Fees collected"
          value={`₹${feeCollected.toLocaleString("en-IN")}`}
          hint={`${feePct}% of ₹${feeTotal.toLocaleString("en-IN")} total · ₹${due.toLocaleString("en-IN")} outstanding`}
          tone="green"
          icon={<TrendingUp size={18} />}
          href="/admin/students"
        />
        <StatCard
          label="Pending complaints"
          value={pendingComplaints}
          hint={`${complaints.length} total complaints`}
          tone={pendingComplaints > 0 ? "amber" : "green"}
          icon={<AlertCircle size={18} />}
          href="/admin/complaints"
        />
      </div>

      {/* Main content grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent complaints */}
        <section className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-navy-900">Recent complaints</h2>
            <Link href="/admin/complaints" className="text-xs font-medium text-blue-600 hover:underline">
              Manage all →
            </Link>
          </div>
          {complaints.length === 0 ? (
            <Empty icon={<AlertCircle size={28} />}>No complaints filed. Great!</Empty>
          ) : (
            <ul className="divide-y divide-slate-50 text-sm">
              {complaints.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      <span className="text-slate-400 font-normal">{c.ticket} · </span>
                      {c.title}
                    </p>
                    <p className="text-xs text-slate-400">{c.student.name} · {fmtDate(c.createdAt)}</p>
                  </div>
                  <Badge tone={statusTone(c.status)}>{COMPLAINT_LABEL[c.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming exams */}
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-navy-900">Upcoming exams</h2>
            <Link href="/admin/examinations" className="text-xs font-medium text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          {exams.length === 0 ? (
            <Empty icon={<CalendarCheck size={28} />}>No exams scheduled soon.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {exams.map((e) => (
                <li key={e.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-navy-900">{e.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {e.course.subject.name} · {e.course.classSection.name}
                  </p>
                  <p className="mt-1 text-xs font-medium text-blue-600">{fmtDate(e.date)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Announcements */}
        {announcements.length > 0 && (
          <section className="card lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-navy-900">Recent announcements</h2>
              <Link href="/admin/announcements" className="text-xs font-medium text-blue-600 hover:underline">
                Manage →
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {announcements.map((a) => (
                <div key={a.id} className="rounded-xl bg-gradient-to-br from-navy-50 to-blue-50 p-4 border border-navy-100">
                  <div className="mb-1 flex items-center gap-2">
                    <BookOpen size={14} className="text-navy-600" />
                    <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">{a.audience === "ALL" ? "All" : a.audience}</span>
                  </div>
                  <p className="font-semibold text-navy-900">{a.title}</p>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{a.body}</p>
                  <p className="mt-2 text-xs text-slate-400">{fmtDate(a.createdAt)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick links */}
        <section className="card lg:col-span-3">
          <h2 className="mb-4 font-bold text-navy-900">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {[
              { href: "/admin/students", label: "Add student", icon: GraduationCap, color: "text-blue-600 bg-blue-50" },
              { href: "/admin/teachers", label: "Add teacher", icon: Users, color: "text-violet-600 bg-violet-50" },
              { href: "/admin/classes", label: "Manage classes", icon: School, color: "text-emerald-600 bg-emerald-50" },
              { href: "/admin/examinations", label: "Schedule exam", icon: CalendarCheck, color: "text-amber-600 bg-amber-50" },
            ].map(({ href, label, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-sm transition-all duration-150 group"
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${color}`}>
                  <Icon size={20} />
                </span>
                <span className="font-semibold text-sm text-slate-700 group-hover:text-navy-900 transition-colors">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
