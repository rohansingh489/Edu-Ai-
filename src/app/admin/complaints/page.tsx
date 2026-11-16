import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader, statusTone, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { updateComplaint } from "@/app/actions/admin";
import { CATEGORY_LABEL, COMPLAINT_LABEL, fmtDateTime } from "@/lib/utils";
import type { ComplaintStatus } from "@prisma/client";

export default async function AdminComplaints({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { institutionId } = await requireAdmin();
  const filter = Object.keys(COMPLAINT_LABEL).includes(sp.status ?? "") ? (sp.status as ComplaintStatus) : undefined;
  const list = await prisma.complaint.findMany({
    where: { institutionId, ...(filter ? { status: filter } : {}) },
    include: { student: { select: { name: true, loginId: true } }, assignedAdmin: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader title="Complaints" subtitle="Review, respond to and resolve student complaints." />
      <Flash sp={sp} />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {[["", "All"], ...Object.entries(COMPLAINT_LABEL)].map(([k, v]) => (
          <a key={k} href={k ? `?status=${k}` : "?"} className={`rounded-full border px-3 py-1 ${((filter ?? "") === k) ? "border-navy-800 bg-navy-800 text-white" : "border-slate-300 bg-white"}`}>{v}</a>
        ))}
      </div>
      {list.length === 0 ? <Empty>No complaints.</Empty> : (
        <div className="space-y-4">
          {list.map((c) => (
            <div key={c.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{c.ticket} · {CATEGORY_LABEL[c.category]} · {fmtDateTime(c.createdAt)}</p>
                  <p className="font-bold text-navy-900">{c.title}</p>
                  <p className="text-xs text-slate-500">{c.student.name} ({c.student.loginId}) · Assigned: {c.assignedAdmin?.name ?? "—"}</p>
                </div>
                <Badge tone={statusTone(c.status)}>{COMPLAINT_LABEL[c.status]}</Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{c.description}</p>
              <form action={updateComplaint} className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
                <input type="hidden" name="id" value={c.id} />
                <label><span className="label">Status</span><select name="status" defaultValue={c.status} className="input">{Object.entries(COMPLAINT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                <label><span className="label">Response to student</span><textarea name="response" rows={2} defaultValue={c.response ?? ""} className="input" /></label>
                <SubmitButton>Update</SubmitButton>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
