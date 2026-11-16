import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { Flash, PageHeader, type SP } from "@/components/ui";
import { MessagingView } from "@/components/messaging";

export default async function StudentMessages({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user, profile } = await requireStudent();
  const tas = await prisma.teachingAssignment.findMany({
    where: { course: { enrollments: { some: { studentId: profile.id } } } },
    include: { teacher: { include: { user: { select: { name: true } } } }, course: { include: { subject: true } } },
  });
  const startOptions = tas.map((t) => ({ courseId: t.courseId, label: `${t.course.subject.name} — ${t.teacher.user.name}` }));
  return (
    <>
      <PageHeader title="Messages" subtitle="Ask your teachers subject-wise questions. This page refreshes automatically." />
      <Flash sp={sp} />
      <MessagingView userId={user.id} role="STUDENT" basePath="/student/messages" selectedId={sp.c} startOptions={startOptions} />
    </>
  );
}
