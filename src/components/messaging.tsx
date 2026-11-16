import Link from "next/link";
import { Paperclip, Send } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "./auto-refresh";
import { SubmitButton } from "./submit-button";
import { Badge, Empty } from "./ui";
import { sendMessage, startConversation } from "@/app/actions/messages";
import { cn, fmtDateTime } from "@/lib/utils";

type Props = {
  userId: string;
  role: "STUDENT" | "TEACHER";
  basePath: "/student/messages" | "/teacher/messages" | "/teacher/queries";
  selectedId?: string;
  onlyUnanswered?: boolean;
  /** Student only: subjects (courses) the student may start a conversation about. */
  startOptions?: { courseId: string; label: string }[];
};

/** Shared inbox for students and teachers: conversation list + thread + composer. Auto-refreshes. */
export async function MessagingView({ userId, role, basePath, selectedId, onlyUnanswered, startOptions }: Props) {
  const where = role === "STUDENT" ? { studentId: userId } : { teacherId: userId };
  let convos = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      student: { select: { name: true } },
      teacher: { select: { name: true } },
      course: { include: { subject: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const unread = await prisma.message.groupBy({
    by: ["conversationId"],
    where: { readAt: null, senderId: { not: userId }, conversation: where },
    _count: { _all: true },
  });
  const unreadMap = new Map(unread.map((u) => [u.conversationId, u._count._all]));
  if (onlyUnanswered) convos = convos.filter((c) => c.messages[0] && c.messages[0].senderId === c.studentId);

  const selected = selectedId
    ? await prisma.conversation.findFirst({
        where: { id: selectedId, ...where },
        include: {
          student: { select: { name: true } },
          teacher: { select: { name: true } },
          course: { include: { subject: true } },
          messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
        },
      })
    : null;
  if (selected) {
    await prisma.message.updateMany({
      where: { conversationId: selected.id, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <AutoRefresh seconds={10} />
      <aside className="card max-h-[70vh] overflow-y-auto p-3">
        {role === "STUDENT" && startOptions && (
          <details className="mb-3 rounded-xl border border-slate-200 p-3" open={!convos.length}>
            <summary className="cursor-pointer text-sm font-semibold text-navy-900">+ Ask a teacher</summary>
            {startOptions.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No teachers are assigned to your subjects yet.</p>
            ) : (
              <form action={startConversation} className="mt-3 space-y-2">
                <select name="courseId" required className="input">
                  {startOptions.map((o) => (
                    <option key={o.courseId} value={o.courseId}>{o.label}</option>
                  ))}
                </select>
                <input name="subject" className="input" placeholder="Topic (optional)" maxLength={150} />
                <textarea name="body" required rows={3} className="input" placeholder="Type your question…" />
                <input type="file" name="file" className="text-xs" />
                <SubmitButton className="w-full btn-sm">Send</SubmitButton>
              </form>
            )}
          </details>
        )}
        {convos.length === 0 ? (
          <Empty>{onlyUnanswered ? "No unanswered questions 🎉" : "No conversations yet."}</Empty>
        ) : (
          <ul className="space-y-1">
            {convos.map((c) => {
              const other = role === "STUDENT" ? c.teacher.name : c.student.name;
              const n = unreadMap.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <Link
                    href={`${basePath}?c=${c.id}`}
                    className={cn("block rounded-xl p-3 text-sm hover:bg-slate-50", selected?.id === c.id && "bg-navy-50")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{other}</span>
                      {n > 0 && <span className="rounded-full bg-blue-600 px-2 text-xs text-white">{n}</span>}
                    </div>
                    <p className="truncate text-xs text-slate-500">{c.course?.subject.name ?? "General"}{c.subject ? ` · ${c.subject}` : ""}</p>
                    <p className="truncate text-xs text-slate-400">{c.messages[0]?.body}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className="card flex min-h-[420px] flex-col p-0">
        {!selected ? (
          <div className="grid flex-1 place-items-center p-8 text-sm text-slate-500">Select a conversation to read and reply.</div>
        ) : (
          <>
            <div className="border-b border-slate-200 p-4">
              <p className="font-bold text-navy-900">{role === "STUDENT" ? selected.teacher.name : selected.student.name}</p>
              <p className="text-xs text-slate-500">
                {selected.course?.subject.name ?? "General"}
                {selected.subject ? ` · ${selected.subject}` : ""}
              </p>
            </div>
            <div className="max-h-[50vh] flex-1 space-y-3 overflow-y-auto p-4">
              {selected.messages.map((m) => {
                const mine = m.senderId === userId;
                return (
                  <div key={m.id} className={cn("flex", mine && "justify-end")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-4 py-2 text-sm", mine ? "bg-navy-800 text-white" : "bg-slate-100")}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      {m.fileName && (
                        <a href={`/api/download/message/${m.id}`} className={cn("mt-1 inline-flex items-center gap-1 text-xs underline", mine ? "text-blue-100" : "text-blue-600")}>
                          <Paperclip size={12} /> {m.fileName}
                        </a>
                      )}
                      <p className={cn("mt-1 text-[10px]", mine ? "text-navy-200" : "text-slate-400")}>
                        {fmtDateTime(m.createdAt)}
                        {mine && (m.readAt ? " · Read" : " · Sent")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form action={sendMessage} className="space-y-2 border-t border-slate-200 p-3">
              <input type="hidden" name="conversationId" value={selected.id} />
              <input type="hidden" name="back" value={basePath} />
              <textarea name="body" required rows={2} className="input" placeholder="Write a reply…" />
              <div className="flex items-center justify-between gap-3">
                <input type="file" name="file" className="text-xs" />
                <SubmitButton><Send size={14} /> Send</SubmitButton>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export function UnreadBadge({ n }: { n: number }) {
  return n > 0 ? <Badge tone="blue">{n} unread</Badge> : null;
}
