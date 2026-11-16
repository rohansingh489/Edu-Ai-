import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { teacherCourses } from "@/lib/teacher";
import { Empty, Flash, PageHeader, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { saveAttendance } from "@/app/actions/teacher";

export default async function TeacherAttendance({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { profile } = await requireTeacher();
  const courses = await teacherCourses(profile.id);
  const courseId = courses.find((c) => c.id === sp.course)?.id ?? courses[0]?.id;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : new Date().toISOString().slice(0, 10);
  const enrollments = courseId
    ? await prisma.enrollment.findMany({ where: { courseId }, include: { student: { include: { user: { select: { name: true, loginId: true } } } } } })
    : [];
  enrollments.sort((a, b) => (a.student.rollNo ?? a.student.user.name).localeCompare(b.student.rollNo ?? b.student.user.name));
  const session = courseId ? await prisma.attendanceSession.findUnique({ where: { courseId_date: { courseId, date: new Date(`${date}T00:00:00.000Z`) } }, include: { records: true } }) : null;
  const existing = new Map(session?.records.map((r) => [r.studentId, r.status]) ?? []);
  return (
    <>
      <PageHeader title="Attendance" subtitle="Pick a subject and date, mark each student, and save. Students below 75% are warned automatically." />
      <Flash sp={sp} />
      {courses.length === 0 ? <Empty>No subjects assigned.</Empty> : (
        <>
          <form className="card mb-6 flex flex-wrap items-end gap-3">
            <label><span className="label">Subject</span>
              <select name="course" defaultValue={courseId} className="input">{courses.map((c) => <option key={c.id} value={c.id}>{c.subject.name} — {c.classSection.name}</option>)}</select></label>
            <label><span className="label">Date</span><input type="date" name="date" defaultValue={date} className="input" /></label>
            <button className="btn-outline">Load</button>
          </form>
          {enrollments.length === 0 ? <Empty>No students enrolled in this subject.</Empty> : (
            <form action={saveAttendance} className="card">
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="date" value={date} />
              {session && <p className="mb-3 text-xs text-slate-500">Attendance already saved for this date – changes will update it.</p>}
              <div className="divide-y divide-slate-100">
                {enrollments.map((e) => {
                  const cur = existing.get(e.studentId) ?? "PRESENT";
                  return (
                    <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                      <span><b>{e.student.user.name}</b> <span className="text-slate-400">{e.student.rollNo ?? e.student.user.loginId}</span></span>
                      <span className="flex gap-4">
                        {(["PRESENT", "ABSENT", "LATE"] as const).map((s) => (
                          <label key={s} className="flex items-center gap-1"><input type="radio" name={`status_${e.studentId}`} value={s} defaultChecked={cur === s} />{s[0] + s.slice(1).toLowerCase()}</label>
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4"><SubmitButton>Save attendance</SubmitButton></div>
            </form>
          )}
        </>
      )}
    </>
  );
}
