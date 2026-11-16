import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { gradeSubmission } from "@/app/actions/teacher";
import { fmtDate, fmtDateTime } from "@/lib/utils";

export default async function AssignmentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { profile } = await requireTeacher();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const a = await prisma.assignment.findFirst({
    where: { id, teacherId: profile.id },
    include: {
      course: { include: { subject: true, classSection: true, enrollments: { include: { student: { include: { user: { select: { name: true } } } } } } } },
      submissions: { include: { student: { include: { user: { select: { name: true } } } } }, orderBy: { submittedAt: "asc" } },
    },
  });
  if (!a) notFound();
  const submitted = new Set(a.submissions.map((s) => s.studentId));
  const missing = a.course.enrollments.filter((e) => !submitted.has(e.studentId));
  return (
    <>
      <Link href="/teacher/assignments" className="text-sm text-blue-600 hover:underline">← All assignments</Link>
      <PageHeader title={a.title} subtitle={`${a.course.subject.name} · ${a.course.classSection.name} · Due ${fmtDate(a.dueDate)} · Max ${a.maxMarks}`} />
      <Flash sp={sp} />
      <p className="card mb-6 whitespace-pre-wrap text-sm">{a.description}</p>
      <h2 className="mb-3 font-bold text-navy-900">Submissions ({a.submissions.length})</h2>
      {a.submissions.length === 0 ? <Empty>No submissions yet.</Empty> : (
        <div className="space-y-4">
          {a.submissions.map((s) => (
            <div key={s.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{s.student.user.name}</p>
                <span className="flex gap-2">{s.submittedAt > a.dueDate && <Badge tone="red">Late</Badge>}<Badge tone={s.gradedAt ? "green" : "amber"}>{s.gradedAt ? `Graded ${s.marks}/${a.maxMarks}` : "Needs grading"}</Badge></span>
              </div>
              <p className="text-xs text-slate-500">Submitted {fmtDateTime(s.submittedAt)}</p>
              {s.content && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm">{s.content}</p>}
              {s.fileName && <a href={`/api/download/submission/${s.id}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline">📎 {s.fileName}</a>}
              <form action={gradeSubmission} className="mt-3 flex flex-wrap items-end gap-3">
                <input type="hidden" name="submissionId" value={s.id} />
                <label><span className="label">Marks</span><input type="number" name="marks" min={0} max={a.maxMarks} step={1} required defaultValue={s.marks ?? ""} className="input w-24" /></label>
                <label className="min-w-[200px] flex-1"><span className="label">Feedback</span><input name="feedback" defaultValue={s.feedback ?? ""} className="input" /></label>
                <SubmitButton>Save grade</SubmitButton>
              </form>
            </div>
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <p className="mt-6 text-sm text-slate-600"><b>Not submitted ({missing.length}):</b> {missing.map((m) => m.student.user.name).join(", ")}</p>
      )}
    </>
  );
}
