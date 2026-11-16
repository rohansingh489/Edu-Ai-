import { ClipboardList, HelpCircle, School, Users, BookOpen, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { teacherCourses } from "@/lib/teacher";
import { Badge, Empty, Field, Flash, PageHeader, StatCard, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { publishAnnouncementTeacher } from "@/app/actions/teacher";
import { fmtDate } from "@/lib/utils";

export default async function TeacherDashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user, profile } = await requireTeacher();
  const courses = await teacherCourses(profile.id);
  const courseIds = courses.map((c) => c.id);
  const classes = Array.from(new Map(courses.map((c) => [c.classSectionId, c.classSection.name])).entries());

  const [students, toGrade, convos, upcoming] = await Promise.all([
    prisma.enrollment.findMany({ where: { courseId: { in: courseIds } }, distinct: ["studentId"], select: { studentId: true } }),
    prisma.assignmentSubmission.count({ where: { gradedAt: null, assignment: { teacherId: profile.id } } }),
    prisma.conversation.findMany({ where: { teacherId: user.id }, include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } }),
    prisma.assignment.findMany({
      where: { teacherId: profile.id, dueDate: { gte: new Date() } },
      include: { course: { include: { subject: true, classSection: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);

  const unanswered = convos.filter((c) => c.messages[0]?.senderId === c.studentId).length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]} 👋`}
        subtitle={`${profile.designation ?? "Faculty"} · ${profile.department?.name ?? profile.institution.name} · ID ${user.loginId}`}
      />
      <Flash sp={sp} />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My classes" value={classes.length} hint="Active class groups" tone="navy" icon={<School size={18} />} href="/teacher/classes" />
        <StatCard label="Total students" value={students.length} hint="Across all subjects" tone="blue" icon={<Users size={18} />} href="/teacher/students" />
        <StatCard label="Submissions to grade" value={toGrade} hint="Pending review" tone={toGrade > 0 ? "amber" : "green"} icon={<ClipboardList size={18} />} href="/teacher/assignments" />
        <StatCard label="Unanswered queries" value={unanswered} hint="Student messages" tone={unanswered > 0 ? "red" : "green"} icon={<HelpCircle size={18} />} href="/teacher/queries" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Subjects list */}
        <section className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-navy-900 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600" /> My subjects
            </h2>
            <Link href="/teacher/subjects" className="text-xs font-medium text-blue-600 hover:underline">View all →</Link>
          </div>
          {courses.length === 0 ? (
            <Empty icon={<BookOpen size={28} />}>No subjects assigned yet. Contact your administrator.</Empty>
          ) : (
            <div className="divide-y divide-slate-50">
              {courses.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{c.subject.name}</p>
                    <p className="text-xs text-slate-500">{c.classSection.name}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {c._count.enrollments} students
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming deadlines */}
          {upcoming.length > 0 && (
            <>
              <div className="my-4 border-t border-slate-100" />
              <h2 className="mb-3 font-bold text-navy-900 flex items-center gap-2">
                <CalendarCheck size={18} className="text-amber-500" /> Upcoming deadlines
              </h2>
              <ul className="space-y-2">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{a.title}</p>
                      <p className="text-xs text-slate-500">{a.course.subject.name} · {a.course.classSection.name}</p>
                    </div>
                    <Badge tone="amber">{fmtDate(a.dueDate)}</Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Publish announcement */}
        <section className="card h-fit">
          <h2 className="mb-4 font-bold text-navy-900">📢 Publish announcement</h2>
          <form action={publishAnnouncementTeacher} className="space-y-3">
            <Field label="Audience">
              <select name="audience" className="input">
                <option value="STUDENT">All my students</option>
                {classes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </Field>
            <Field label="Title">
              <input name="title" required minLength={3} className="input" placeholder="Announcement title" />
            </Field>
            <Field label="Message">
              <textarea name="body" required minLength={5} rows={4} className="input resize-none" placeholder="Write your message here…" />
            </Field>
            <SubmitButton>Publish to students</SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
