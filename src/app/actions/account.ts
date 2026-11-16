"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, portalForRole, verifyPassword } from "@/lib/auth";
import { flash, parseForm } from "@/lib/flash";
import { audit } from "@/lib/notify";
import { redirect } from "next/navigation";

const pwSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "New password must be at least 8 characters").max(100),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

export async function changePassword(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const back = `/${portalForRole(user.role)}/settings`;
  const d = parseForm(pwSchema, fd, back);
  if (!(await verifyPassword(d.current, user.passwordHash))) flash(back, "err", "Current password is incorrect.");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(d.next) } });
  await audit(user.id, user.institutionId, "PASSWORD_CHANGED", "User", user.id);
  flash(back, "ok", "Password updated.");
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  flash(`/${portalForRole(user.role)}/notifications`, "ok", "All notifications marked as read.");
}
