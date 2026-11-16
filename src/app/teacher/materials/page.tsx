import { Download, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { teacherCourses } from "@/lib/teacher";
import { Badge, Empty, Field, Flash, PageHeader, Table, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { deleteMaterial, uploadMaterial } from "@/app/actions/teacher";
import { MATERIAL_LABEL, fmtDate } from "@/lib/utils";

export default async function TeacherMaterials({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user, profile } = await requireTeacher();
  const [courses, list] = await Promise.all([
    teacherCourses(profile.id),
    prisma.studyMaterial.findMany({ where: { uploadedById: user.id }, include: { course: { include: { subject: true, classSection: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageHeader title="Study materials" subtitle="Upload notes, PDFs, presentations, question papers or video links for your classes." />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card h-fit">
          <h2 className="mb-3 font-bold text-navy-900">Upload material</h2>
          {courses.length === 0 ? <Empty>No subjects assigned.</Empty> : (
            <form action={uploadMaterial} className="space-y-3">
              <Field label="Subject / class"><select name="courseId" className="input">{courses.map((c) => <option key={c.id} value={c.id}>{c.subject.name} — {c.classSection.name}</option>)}</select></Field>
              <Field label="Type"><select name="type" className="input">{Object.entries(MATERIAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Title"><input name="title" required minLength={3} className="input" /></Field>
              <Field label="Description"><textarea name="description" rows={2} className="input" /></Field>
              <Field label="File (max 10 MB)"><input type="file" name="file" className="text-sm" /></Field>
              <Field label="or Video link"><input name="videoUrl" type="url" placeholder="https://…" className="input" /></Field>
              <SubmitButton className="w-full">Upload & notify students</SubmitButton>
            </form>
          )}
        </section>
        <section className="lg:col-span-2">
          {list.length === 0 ? <Empty>Nothing uploaded yet.</Empty> : (
            <Table head={["Title", "Type", "Class", "Added", ""]}>
              {list.map((m) => (
                <tr key={m.id}>
                  <td className="td font-medium">{m.title}<div className="flex gap-3 text-xs font-normal">
                    {m.fileName && <a className="text-blue-600 hover:underline" href={`/api/download/material/${m.id}`}><Download size={11} className="mr-1 inline" />{m.fileName}</a>}
                    {m.videoUrl && <a className="text-blue-600 hover:underline" href={m.videoUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={11} className="mr-1 inline" />Video</a>}
                  </div></td>
                  <td className="td"><Badge tone="blue">{MATERIAL_LABEL[m.type]}</Badge></td>
                  <td className="td">{m.course ? `${m.course.subject.name} · ${m.course.classSection.name}` : "—"}</td>
                  <td className="td">{fmtDate(m.createdAt)}</td>
                  <td className="td"><form action={deleteMaterial}><input type="hidden" name="id" value={m.id} /><SubmitButton variant="btn-danger" className="btn-sm" confirm="Delete this material?">Delete</SubmitButton></form></td>
                </tr>
              ))}
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
