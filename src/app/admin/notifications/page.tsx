import { requireAdmin } from "@/lib/auth";
import { NotificationsView } from "@/components/notifications-view";
import type { SP } from "@/components/ui";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const { user } = await requireAdmin();
  return <NotificationsView userId={user.id} sp={await searchParams} />;
}
