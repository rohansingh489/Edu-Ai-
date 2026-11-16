import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Empty, Field, Flash, PageHeader, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { publishAnnouncementAdmin } from "@/app/actions/admin";
import { fmtDateTime } from "@/lib/utils";

export default async function AdminAnnouncements({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { institutionId } = await requireAdmin();
  const [classes, list] = await Promise.all([
    prisma.classSection.findMany({ where: { institutionId }, orderBy: { name: "asc" } }),
    prisma.announcement.findMany({ where: { institutionId }, include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const nameOf = (a: string) => (a === "ALL" ? "Everyone" : a === "STUDENT" ? "All students" : a === "TEACHER" ? "All teachers" : classes.find((c) => c.id === a)?.name ?? "Class");
  return (
    <>
      <PageHeader title="Announcements" subtitle="Everyone targeted also receives an in-app notification." />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <form action={publishAnnouncementAdmin} className="card h-fit space-y-3">
          <h2 className="font-bold text-navy-900">New announcement</h2>
          <Field label="Audience"><select name="audience" className="input"><option value="ALL">Everyone</option><option value="STUDENT">All students</option><option value="TEACHER">All teachers</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Title"><input name="title" required minLength={3} className="input" /></Field>
          <Field label="Message"><textarea name="body" required minLength={5} rows={5} className="input" /></Field>
          <SubmitButton className="w-full">Publish</SubmitButton>
        </form>
        <section className="space-y-3 lg:col-span-2">
          {list.length === 0 ? <Empty>No announcements yet.</Empty> : list.map((a) => (
            <div key={a.id} className="card">
              <p className="font-bold text-navy-900">{a.title}</p>
              <p className="text-xs text-slate-500">{nameOf(a.audience)} · {a.author.name} · {fmtDateTime(a.createdAt)}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
