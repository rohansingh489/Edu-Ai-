import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { BarCard, PieCard } from "@/components/charts";
import { PageHeader } from "@/components/ui";
import { COMPLAINT_LABEL, pct } from "@/lib/utils";

export default async function AdminAnalytics() {
  const { institutionId } = await requireAdmin();
  const [classes, att, results, complaints, subs] = await Promise.all([
    prisma.classSection.findMany({ where: { institutionId }, include: { _count: { select: { students: true } } }, orderBy: { name: "asc" } }),
    prisma.attendanceRecord.findMany({ where: { session: { institutionId } }, select: { status: true, session: { select: { course: { select: { classSection: { select: { name: true } } } } } } } }),
    prisma.studentResult.findMany({ where: { examination: { institutionId, resultsPublished: true } }, select: { marks: true, grade: true, examination: { select: { maxMarks: true, course: { select: { subject: { select: { name: true } } } } } } } }),
    prisma.complaint.groupBy({ by: ["status"], where: { institutionId }, _count: { _all: true } }),
    prisma.assignmentSubmission.count({ where: { assignment: { institutionId } } }),
  ]);
  const attBy = new Map<string, [number, number]>();
  for (const r of att) { const k = r.session.course.classSection.name; const v = attBy.get(k) ?? [0, 0]; v[1]++; if (r.status !== "ABSENT") v[0]++; attBy.set(k, v); }
  const perfBy = new Map<string, number[]>();
  for (const r of results) { const k = r.examination.course.subject.name; perfBy.set(k, [...(perfBy.get(k) ?? []), pct(r.marks, r.examination.maxMarks)]); }
  const grades = new Map<string, number>();
  for (const r of results) grades.set(r.grade, (grades.get(r.grade) ?? 0) + 1);
  return (
    <>
      <PageHeader title="Reports & analytics" subtitle={`${subs} assignment submissions received so far.`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <BarCard title="Students per class" data={classes.map((c) => ({ name: c.name, value: c._count.students }))} />
        <BarCard title="Attendance % by class" unit="%" data={Array.from(attBy.entries()).map(([name, [p, t]]) => ({ name, value: pct(p, t) }))} />
        <BarCard title="Average result % by subject" unit="%" data={Array.from(perfBy.entries()).map(([name, v]) => ({ name, value: Math.round(v.reduce((a, b) => a + b, 0) / v.length) }))} />
        <PieCard title="Grade distribution" data={Array.from(grades.entries()).sort().map(([name, value]) => ({ name, value }))} />
        <PieCard title="Complaints by status" data={complaints.map((c) => ({ name: COMPLAINT_LABEL[c.status], value: c._count._all }))} />
      </div>
    </>
  );
}
