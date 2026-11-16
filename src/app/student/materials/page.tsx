import type { MaterialType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, PageHeader, type SP } from "@/components/ui";
import { MATERIAL_LABEL, fmtDate } from "@/lib/utils";
import { Download, ExternalLink, Search } from "lucide-react";

export default async function StudentMaterials({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const type = sp.type ?? "";
  const subject = sp.subject ?? "";
  const { profile, institutionId } = await requireStudent();

  const courses = await prisma.course.findMany({
    where: { enrollments: { some: { studentId: profile.id } } },
    include: { subject: true },
    orderBy: { subject: { name: "asc" } },
  });
  const validTypes = Object.keys(MATERIAL_LABEL);

  const items = await prisma.studyMaterial.findMany({
    where: {
      institutionId,
      OR: [{ courseId: null }, { courseId: { in: courses.map((c) => c.id) } }],
      ...(subject && courses.some((c) => c.id === subject) ? { courseId: subject } : {}),
      ...(validTypes.includes(type) ? { type: type as MaterialType } : {}),
      ...(q ? { AND: [{ OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] }] } : {}),
    },
    include: { course: { include: { subject: true } }, uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader title="Study materials" subtitle="Notes, presentations, question papers and video lectures from your teachers." />
      <form className="card mb-6 grid gap-3 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Search materials…" className="input pl-9" />
        </div>
        <select name="subject" defaultValue={subject} className="input">
          <option value="">All subjects</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.subject.name}</option>)}
        </select>
        <select name="type" defaultValue={type} className="input">
          <option value="">All types</option>
          {Object.entries(MATERIAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-primary sm:col-span-4 sm:w-fit">Apply filters</button>
      </form>

      {items.length === 0 ? <Empty>No materials found.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => (
            <div key={m.id} className="card flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-navy-900">{m.title}</p>
                <Badge tone="blue">{MATERIAL_LABEL[m.type]}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">{m.course?.subject.name ?? "All subjects"} · {m.uploadedBy.name} · {fmtDate(m.createdAt)}</p>
              {m.description && <p className="mt-2 text-sm text-slate-600">{m.description}</p>}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {m.fileName && (
                  <a href={`/api/download/material/${m.id}`} className="btn-outline btn-sm"><Download size={14} /> {m.fileName.length > 24 ? m.fileName.slice(0, 22) + "…" : m.fileName}</a>
                )}
                {m.videoUrl && (
                  <a href={m.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-accent btn-sm"><ExternalLink size={14} /> Watch video</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
