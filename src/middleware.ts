import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// First line of defence: verifies the signed session cookie and role for each portal.
// Every layout/page/route ALSO re-checks the user and role against the database (src/lib/auth.ts).

const PORTAL_ROLES: Record<string, string[]> = {
  student: ["STUDENT"],
  teacher: ["TEACHER"],
  admin: ["ADMIN", "SUPER_ADMIN"],
};

export async function middleware(req: NextRequest) {
  const portal = req.nextUrl.pathname.split("/")[1];
  const allowed = PORTAL_ROLES[portal];
  if (!allowed) return NextResponse.next();

  const loginUrl = new URL(`/login/${portal}`, req.url);
  const token = req.cookies.get("ec_session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return NextResponse.redirect(loginUrl);

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (!allowed.includes(String(payload.role))) {
      const own = payload.role === "STUDENT" ? "student" : payload.role === "TEACHER" ? "teacher" : "admin";
      return NextResponse.redirect(new URL(`/${own}/dashboard`, req.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/student/:path*", "/teacher/:path*", "/admin/:path*"],
};
