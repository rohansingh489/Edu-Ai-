import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { Empty, Flash, PageHeader, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { markAllNotificationsRead } from "@/app/actions/account";
import { cn, fmtDateTime } from "@/lib/utils";
import { Bell } from "lucide-react";

export default async function StudentNotifications({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user } = await requireStudent();
  const list = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = list.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`${unread} unread`}
        action={unread > 0 ? <form action={markAllNotificationsRead}><SubmitButton variant="btn-outline">Mark all as read</SubmitButton></form> : undefined}
      />
      <Flash sp={sp} />
      {list.length === 0 ? <Empty>No notifications yet.</Empty> : (
        <ul className="space-y-2">
          {list.map((n) => {
            const body = (
              <div className={cn("card flex gap-3 !p-4 transition hover:shadow-md", !n.readAt && "border-blue-200 bg-blue-50/40")}>
                <Bell size={18} className={n.readAt ? "mt-0.5 text-slate-300" : "mt-0.5 text-blue-600"} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-slate-600">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{fmtDateTime(n.createdAt)}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{n.link ? <Link href={n.link}>{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </>
  );
}
