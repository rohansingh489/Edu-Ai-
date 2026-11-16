import type { NotificationType } from "@prisma/client";
import { prisma } from "./prisma";
import { sendNotificationEmail, sendSMS } from "./comms";

/**
 * Creates in-app notifications AND dispatches real-time emails and SMS to recipients.
 */
export async function notifyUsers(
  userIds: string[],
  institutionId: string | null,
  n: { type: NotificationType; title: string; body: string; link?: string }
) {
  const ids = Array.from(new Set(userIds));
  if (!ids.length) return;

  // 1. Create in-app notification rows
  await prisma.notification.createMany({
    data: ids.map((userId) => ({ userId, institutionId, ...n })),
  });

  // 2. Fetch recipients to dispatch real email & SMS
  try {
    const recipients = await prisma.user.findMany({
      where: { id: { in: ids }, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        studentProfile: { select: { phone: true } },
        teacherProfile: { select: { phone: true } },
      },
    });

    // Dispatch emails and SMS in the background (non-blocking)
    for (const r of recipients) {
      if (r.email) {
        sendNotificationEmail({
          to: r.email,
          name: r.name,
          title: n.title,
          body: n.body,
          link: n.link,
        }).catch((err) => console.error(`[NOTIFY EMAIL ERR] ${r.email}:`, err));
      }

      const phone = r.studentProfile?.phone || r.teacherProfile?.phone;
      if (phone) {
        sendSMS({
          phone,
          name: r.name,
          message: `${n.title}: ${n.body}`,
        }).catch((err) => console.error(`[NOTIFY SMS ERR] ${phone}:`, err));
      }
    }
  } catch (err) {
    console.error("[NOTIFY RECIPIENT DISPATCH ERROR]", err);
  }
}

export async function audit(
  userId: string | null,
  institutionId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  meta?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: { userId, institutionId, action, entity, entityId, meta: meta as object | undefined },
    });
  } catch {
    /* audit must never break the main flow */
  }
}
