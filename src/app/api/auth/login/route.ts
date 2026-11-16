import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { homeForRole, startSession, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/notify";

const schema = z.object({
  portal: z.enum(["student", "teacher", "admin"]),
  identifier: z.string().trim().min(1, "Enter your ID or email").max(200),
  password: z.string().min(1, "Enter your password").max(200),
});

const PORTAL_ROLES = {
  student: ["STUDENT"],
  teacher: ["TEACHER"],
  admin: ["ADMIN", "SUPER_ADMIN"],
} as const;

// Simple in-memory throttle (per identifier+IP). Use Redis or similar in multi-instance production.
const attempts = new Map<string, { n: number; first: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { portal, identifier, password } = parsed.data;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const key = `${identifier.toLowerCase()}|${ip}`;
    const rec = attempts.get(key);
    if (rec && Date.now() - rec.first < WINDOW_MS && rec.n >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: "insensitive" } },
          { loginId: { equals: identifier, mode: "insensitive" } },
        ],
      },
    });

    const fail = async (customMessage?: string) => {
      const r = attempts.get(key);
      if (!r || Date.now() - r.first > WINDOW_MS) attempts.set(key, { n: 1, first: Date.now() });
      else r.n++;
      await audit(user?.id ?? null, user?.institutionId ?? null, "LOGIN_FAILED", "User", user?.id, { portal });
      return NextResponse.json({ error: customMessage || "Invalid credentials for this portal." }, { status: 401 });
    };

    if (!user || !user.isActive) return fail();

    // Verify password first
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) return fail();

    // If password is valid but user accessed the wrong portal, guide them to the correct one
    if (!(PORTAL_ROLES[portal] as readonly string[]).includes(user.role)) {
      const targetPortal = user.role === "STUDENT" ? "Student (/login/student)" : user.role === "TEACHER" ? "Teacher (/login/teacher)" : "Administrator (/login/admin)";
      return fail(`This account belongs to the ${targetPortal} portal. Please sign in there.`);
    }

    attempts.delete(key);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await startSession(user);
    await audit(user.id, user.institutionId, "LOGIN", "User", user.id, { portal });
    return NextResponse.json({ redirect: homeForRole(user.role) });
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "Database or server connection error. Please try again." },
      { status: 500 }
    );
  }
}
