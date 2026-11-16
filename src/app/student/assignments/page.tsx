import type { Assignment, AssignmentSubmission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { submitAssignment } from "@/app/actions/student";
import { fmtDate, fmtDateTime } from "@/lib/utils";

export default async function StudentAssignments({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { profile, institutionId } = await requireStudent();
  const now = new Date();
  const list = await prisma.assignment.findMany({
    where: { institutionId, course: { enrollments: { some: { studentId: profile.id } } } },
    include: {
      course: { include: { subject: true } },
      teacher: { include: { user: { select: { name: true } } } },
      submissions: { where: { studentId: profile.id } },
    },
    orderBy: { dueDate: "asc" },
  });
  const pending = list.filter((a) => !a.submissions.length);
  const done = list.filter((a) => a.submissions.length);

  return (
    <>
      <PageHeader title="Assignments" subtitle="Submit your work before the due date. You can resubmit until it is graded." />
      <Flash sp={sp} />
      <h2 className="mb-3 font-bold text-navy-900">Pending ({pending.length})</h2>
      {pending.length === 0 ? <Empty>No pending assignments.</Empty> : (
        <div className="space-y-4">
          {pending.map((a) => <AssignmentCard key={a.id} a={a} overdue={a.dueDate < now} />)}
        </div>
      )}
      <h2 className="mb-3 mt-8 font-bold text-navy-900">Submitted ({done.length})</h2>
      {done.length === 0 ? <Empty>Nothing submitted yet.</Empty> : (
        <div className="space-y-4">
          {done.map((a) => <AssignmentCard key={a.id} a={a} overdue={false} />)}
        </div>
      )}
    </>
  );
}

type Item = Assignment & {
  course: { subject: { name: string } };
  teacher: { user: { name: string } };
  submissions: AssignmentSubmission[];
};

function AssignmentCard({ a, overdue }: { a: Item; overdue: boolean }) {
  const sub = a.submissions[0];
  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-navy-900">{a.title}</p>
          <p className="text-xs text-slate-500">{a.course.subject.name} · {a.teacher.user.name} · Max {a.maxMarks} marks</p>
        </div>
        {sub ? (
          sub.gradedAt ? <Badge tone="green">Graded {sub.marks}/{a.maxMarks}</Badge> : <Badge tone="blue">Submitted {fmtDateTime(sub.submittedAt)}</Badge>
        ) : (
          <Badge tone={overdue ? "red" : "amber"}>{overdue ? "Overdue" : "Due"} {fmtDate(a.dueDate)}</Badge>
        )}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{a.description}</p>
      {sub?.feedback && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><b>Feedback:</b> {sub.feedback}</p>}
      {sub && (
        <div className="mt-3 text-sm text-slate-600">
          {sub.content && <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3">{sub.content}</p>}
          {sub.fileName && <a className="mt-2 inline-block text-blue-600 hover:underline" href={`/api/download/submission/${sub.id}`}>📎 {sub.fileName}</a>}
        </div>
      )}
      {(!sub || !sub.gradedAt) && (
        <form action={submitAssignment} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <input type="hidden" name="assignmentId" value={a.id} />
          <textarea name="content" rows={3} className="input" placeholder="Write your answer (optional if you attach a file)" defaultValue={sub?.content ?? ""} />
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" name="file" className="text-sm" />
            <SubmitButton>{sub ? "Resubmit" : "Submit"}</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
