import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, Field, Flash, PageHeader, statusTone, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createComplaint } from "@/app/actions/student";
import { CATEGORY_LABEL, COMPLAINT_LABEL, fmtDate, fmtDateTime } from "@/lib/utils";

type HistoryItem = { at: string; status: string; note: string; by: string };

export default async function StudentComplaints({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user } = await requireStudent();
  const list = await prisma.complaint.findMany({
    where: { studentId: user.id },
    include: { assignedAdmin: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader title="Complaints" subtitle="Report a problem and track its resolution." />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card h-fit">
          <h2 className="mb-3 font-bold text-navy-900">New complaint</h2>
          <form action={createComplaint} className="space-y-3">
            <Field label="Category">
              <select name="category" className="input" required>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Title"><input name="title" required minLength={5} maxLength={150} className="input" /></Field>
            <Field label="Description"><textarea name="description" required minLength={15} rows={5} className="input" /></Field>
            <SubmitButton className="w-full">Submit complaint</SubmitButton>
          </form>
        </section>

        <section className="space-y-4 lg:col-span-2">
          {list.length === 0 ? <Empty>You haven&apos;t submitted any complaints.</Empty> : list.map((c) => {
            const history = (Array.isArray(c.history) ? c.history : []) as HistoryItem[];
            return (
              <div key={c.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{c.ticket} · {CATEGORY_LABEL[c.category]} · {fmtDate(c.createdAt)}</p>
                    <p className="font-bold text-navy-900">{c.title}</p>
                  </div>
                  <Badge tone={statusTone(c.status)}>{COMPLAINT_LABEL[c.status]}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{c.description}</p>
                <p className="mt-2 text-xs text-slate-500">Assigned to: {c.assignedAdmin?.name ?? "Not yet assigned"}</p>
                {c.response && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><b>Admin response:</b> {c.response}</p>}
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-blue-600">Resolution history ({history.length})</summary>
                  <ol className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                    {history.map((h, i) => (
                      <li key={i}>
                        <p className="font-medium">{COMPLAINT_LABEL[h.status] ?? h.status} <span className="text-xs font-normal text-slate-400">· {fmtDateTime(h.at)} · {h.by}</span></p>
                        <p className="text-slate-600">{h.note}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
