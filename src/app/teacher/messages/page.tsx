import { requireTeacher } from "@/lib/auth";
import { Flash, PageHeader, type SP } from "@/components/ui";
import { MessagingView } from "@/components/messaging";

export default async function TeacherMessages({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user } = await requireTeacher();
  return (
    <>
      <PageHeader title="Messages" subtitle="All your conversations with students. Refreshes automatically." />
      <Flash sp={sp} />
      <MessagingView userId={user.id} role="TEACHER" basePath="/teacher/messages" selectedId={sp.c} />
    </>
  );
}
