"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { flash, parseForm } from "@/lib/flash";
import { audit, notifyUsers } from "@/lib/notify";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.string().trim().email("Enter a valid email"),
  institution: z.string().trim().max(150).optional(),
  message: z.string().trim().min(10, "Message is too short").max(3000),
  redirectTo: z.enum(["/contact", "/#contact"]),
});

export async function submitContact(fd: FormData) {
  const back = fd.get("redirectTo") === "/contact" ? "/contact" : "/";
  const d = parseForm(contactSchema, fd, back);
  await audit(null, null, "CONTACT_MESSAGE", "Contact", undefined, { name: d.name, email: d.email, institution: d.institution, message: d.message });
  flash(back, "ok", "Thanks! Your message has been received. We will get back to you soon.");
}

const resetSchema = z.object({ identifier: z.string().trim().min(3, "Enter your ID or email").max(200) });

// Does not reveal whether the account exists. Notifies the institution's admins, who set a new password.
export async function requestPasswordReset(fd: FormData) {
  const { identifier } = parseForm(resetSchema, fd, "/forgot-password");
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { loginId: { equals: identifier, mode: "insensitive" } },
      ],
    },
  });
  if (user && user.institutionId && user.isActive) {
    const admins = await prisma.user.findMany({
      where: { institutionId: user.institutionId, role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
      select: { id: true },
    });
    await notifyUsers(admins.map((a) => a.id), user.institutionId, {
      type: "SYSTEM",
      title: "Password reset requested",
      body: `${user.name} (${user.loginId}) asked for a password reset. Open their profile and set a temporary password.`,
      link: user.role === "STUDENT" ? `/admin/students/${user.id}` : user.role === "TEACHER" ? `/admin/teachers/${user.id}` : "/admin/dashboard",
    });
    await audit(user.id, user.institutionId, "PASSWORD_RESET_REQUESTED", "User", user.id);
  }
  flash("/forgot-password", "ok", "If that account exists, your administrator has been notified and will contact you with a temporary password.");
}
