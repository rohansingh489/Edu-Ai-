import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Role, User } from "@prisma/client";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "ec_session";
export const INSTITUTION_COOKIE = "ec_inst";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Set it in .env (see .env.example).");
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function portalForRole(role: Role) {
  if (role === "STUDENT") return "student";
  if (role === "TEACHER") return "teacher";
  return "admin";
}

export function homeForRole(role: Role) {
  return `/${portalForRole(role)}/dashboard`;
}

export async function startSession(user: Pick<User, "id" | "role">) {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(INSTITUTION_COOKIE);
}

/** Returns the signed-in, still-active user, re-checked against the database on every call. */
export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.role !== payload.role) return null;
    return user;
  } catch {
    return null;
  }
}

async function requireUser(roles: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login/${roles[0] === "STUDENT" ? "student" : roles[0] === "TEACHER" ? "teacher" : "admin"}`);
  if (!roles.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}

export async function requireStudent() {
  const user = await requireUser(["STUDENT"]);
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { institution: true, classSection: true, program: true },
  });
  if (!profile) redirect("/login/student");
  return { user, profile, institutionId: profile.institutionId };
}

export async function requireTeacher() {
  const user = await requireUser(["TEACHER"]);
  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    include: { institution: true, department: true },
  });
  if (!profile) redirect("/login/teacher");
  return { user, profile, institutionId: profile.institutionId };
}

/** ADMIN is scoped to their institution. SUPER_ADMIN can switch institution via cookie. */
export async function requireAdmin() {
  const user = await requireUser(["ADMIN", "SUPER_ADMIN"]);
  let institutionId = user.institutionId;
  if (user.role === "SUPER_ADMIN") {
    const jar = await cookies();
    const chosen = jar.get(INSTITUTION_COOKIE)?.value;
    if (chosen) {
      const inst = await prisma.institution.findUnique({ where: { id: chosen } });
      if (inst) institutionId = inst.id;
    }
    if (!institutionId) {
      const first = await prisma.institution.findFirst({ orderBy: { createdAt: "asc" } });
      institutionId = first?.id ?? null;
    }
  }
  if (!institutionId) redirect("/login/admin");
  const institution = await prisma.institution.findUniqueOrThrow({ where: { id: institutionId } });
  return { user, institutionId, institution, isSuper: user.role === "SUPER_ADMIN" };
}

/** Any signed-in user (used by shared API routes). */
export async function requireAnyUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user;
}
