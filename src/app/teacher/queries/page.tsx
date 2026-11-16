import { requireTeacher } from "@/lib/auth";
import { Flash, PageHeader, type SP } from "@/components/ui";
import { MessagingView } from "@/components/messaging";

export default async function TeacherQueries({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user } = await requireTeacher();
  return (
    <>
      <PageHeader title="Student queries" subtitle="Conversations where the student is waiting for your reply." />
      <Flash sp={sp} />
      <MessagingView userId={user.id} role="TEACHER" basePath="/teacher/queries" selectedId={sp.c} onlyUnanswered />
    </>
  );
}
