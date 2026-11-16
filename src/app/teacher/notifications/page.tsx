import { requireTeacher } from "@/lib/auth";
import { NotificationsView } from "@/components/notifications-view";
import type { SP } from "@/components/ui";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const { user } = await requireTeacher();
  return <NotificationsView userId={user.id} sp={await searchParams} />;
}
