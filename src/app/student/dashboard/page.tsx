import Link from "next/link";
import { CalendarCheck, ClipboardList, GraduationCap, Clock, MessageSquare, Bot, Bell, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader, Progress, StatCard, statusTone, type SP } from "@/components/ui";
import { attendanceByCourse, overallAttendance } from "@/lib/helpers";
import { fmtDate, fmtDateTime, pct } from "@/lib/utils";

export default async function StudentDashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user, profile, institutionId } = await requireStudent();
  const now = new Date();

  const [att, assignments, results, unreadMsgs, notes, complaints, announcements] = await Promise.all([
    attendanceByCourse(profile.id),
    prisma.assignment.findMany({
      where: { institutionId, course: { enrollments: { some: { studentId: profile.id } } } },
      include: {
        course: { include: { subject: true } },
        submissions: { where: { studentId: profile.id }, select: { id: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.studentResult.findMany({
      where: { studentId: profile.id, examination: { resultsPublished: true } },
      include: { examination: { include: { course: { include: { subject: true } } } } },
      orderBy: { examination: { date: "desc" } },
    }),
    prisma.message.count({ where: { readAt: null, senderId: { not: user.id }, conversation: { studentId: user.id } } }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.complaint.findMany({ where: { studentId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.announcement.findMany({
      where: { institutionId, audience: { in: ["ALL", "STUDENT", profile.classSectionId ?? "-"] } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const overall = overallAttendance(att);
  const pending = assignments.filter((a) => a.submissions.length === 0);
  const upcoming = pending.filter((a) => a.dueDate >= now);
  const overdue = pending.filter((a) => a.dueDate < now);
  const latest = results[0];
  const avg = results.length
    ? Math.round((results.reduce((n, r) => n + pct(r.marks, r.examination.maxMarks), 0) / results.length) * 10) / 10
    : null;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]} 👋`}
        subtitle={`${profile.institution.name} · ${profile.classSection?.name ?? profile.program?.name ?? "Unassigned"}${profile.semester ? ` · Sem ${profile.semester}` : ""} · ID: ${user.loginId}`}
      />
      <Flash sp={sp} />

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Attendance"
          value={overall.total ? `${overall.pct}%` : "—"}
          hint={overall.total ? `${overall.present}/${overall.total} classes attended` : "No attendance recorded"}
          tone={overall.pct >= 75 || !overall.total ? "green" : "red"}
          icon={<CalendarCheck size={18} />}
          href="/student/attendance"
          delta={overall.pct < 75 && overall.total > 0 ? "⚠ Below 75% — risk of shortage" : undefined}
        />
        <StatCard
          label="Due assignments"
          value={upcoming.length}
          hint={upcoming[0] ? `Next: ${upcoming[0].title} · ${fmtDate(upcoming[0].dueDate)}` : "Nothing due soon"}
          tone={overdue.length > 0 ? "red" : "blue"}
          icon={<ClipboardList size={18} />}
          href="/student/assignments"
          delta={overdue.length > 0 ? `${overdue.length} overdue` : undefined}
        />
        <StatCard
          label="Latest result"
          value={latest ? `${latest.marks}/${latest.examination.maxMarks}` : "—"}
          hint={latest ? `${latest.examination.title} · Grade ${latest.grade}` : "No published results yet"}
          tone="navy"
          icon={<GraduationCap size={18} />}
          href="/student/results"
        />
        <StatCard
          label="Academic average"
          value={avg !== null ? `${avg}%` : "—"}
          hint={`Across ${results.length} published result${results.length !== 1 ? "s" : ""}`}
          tone={avg !== null ? (avg >= 75 ? "green" : avg >= 50 ? "amber" : "red") : "navy"}
          icon={<TrendingUp size={18} />}
          href="/student/results"
        />
        <StatCard
          label="Teacher messages"
          value={unreadMsgs}
          hint="Unread messages"
          tone={unreadMsgs > 0 ? "amber" : "blue"}
          icon={<MessageSquare size={18} />}
          href="/student/messages"
        />
        <StatCard
          label="EduBot AI"
          value="Ask anything"
          hint="Chat with AI · Study from your PDF"
          tone="navy"
          icon={<Bot size={18} />}
          href="/student/chatbot"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Attendance by subject */}
        <section className="card lg:col-span-2">
          <h2 className="mb-4 font-bold text-navy-900">Subject-wise attendance</h2>
          {att.length === 0 ? (
            <Empty icon={<CalendarCheck size={28} />}>No attendance recorded for you yet.</Empty>
          ) : (
            <div className="space-y-3">
              {att.map((a) => (
                <div key={a.courseId}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-slate-800">{a.subject}</span>
                    <span className={`font-semibold ${a.pct >= 75 ? "text-emerald-600" : a.pct >= 60 ? "text-amber-500" : "text-red-600"}`}>
                      {a.pct}% <span className="font-normal text-slate-400">({a.present}/{a.total})</span>
                    </span>
                  </div>
                  <Progress value={a.pct} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Notifications */}
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-navy-900">Notifications</h2>
            <Link href="/student/notifications" className="text-xs font-medium text-blue-600 hover:underline">View all →</Link>
          </div>
          {notes.length === 0 ? (
            <Empty icon={<Bell size={24} />}>You&apos;re all caught up!</Empty>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="flex gap-2.5 text-sm">
                  <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.readAt ? "bg-slate-200" : "bg-blue-500"}`} />
                  <div className="min-w-0">
                    <p className={`font-medium truncate ${n.readAt ? "text-slate-500" : "text-slate-900"}`}>{n.title}</p>
                    <p className="text-xs text-slate-400">{fmtDateTime(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Due assignments */}
        <section className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-navy-900">Assignments due</h2>
            <Link href="/student/assignments" className="text-xs font-medium text-blue-600 hover:underline">All assignments →</Link>
          </div>
          {pending.length === 0 ? (
            <Empty icon={<ClipboardList size={28} />}>No pending assignments 🎉</Empty>
          ) : (
            <ul className="divide-y divide-slate-50">
              {pending.slice(0, 5).map((a) => {
                const isOverdue = a.dueDate < now;
                return (
                  <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                    <div className="min-w-0 mr-3">
                      <p className="font-semibold text-slate-900 truncate">{a.title}</p>
                      <p className="text-xs text-slate-500">{a.course.subject.name}</p>
                    </div>
                    <Badge tone={isOverdue ? "red" : "amber"}>
                      {isOverdue ? "⚠ Overdue" : "Due"} {fmtDate(a.dueDate)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Complaints */}
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-navy-900">My complaints</h2>
            <Link href="/student/complaints" className="text-xs font-medium text-blue-600 hover:underline">File/View →</Link>
          </div>
          {complaints.length === 0 ? (
            <Empty>No complaints filed.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {complaints.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-slate-700">{c.ticket} · {c.title}</span>
                  <Badge tone={statusTone(c.status)}>{c.status.replace("_", " ")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Announcements */}
        {announcements.length > 0 && (
          <section className="card lg:col-span-3">
            <h2 className="mb-4 font-bold text-navy-900">📢 Announcements</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {announcements.map((a) => (
                <div key={a.id} className="rounded-xl bg-gradient-to-br from-navy-50 to-blue-50 border border-navy-100 p-4">
                  <p className="font-semibold text-navy-900">{a.title}</p>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">{a.body}</p>
                  <p className="mt-2 text-xs text-slate-400">{fmtDate(a.createdAt)}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
