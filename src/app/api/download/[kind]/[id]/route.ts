import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { readUpload } from "@/lib/storage";

// Authorised file download. Every kind re-checks that the signed-in user may see the file.
export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let filePath: string | null = null;
  let fileName: string | null = null;
  let allowed = false;

  if (kind === "material") {
    const m = await prisma.studyMaterial.findUnique({ where: { id } });
    if (m && m.institutionId === user.institutionId) {
      filePath = m.filePath;
      fileName = m.fileName;
      if (user.role === "STUDENT") {
        const sp = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
        allowed =
          !m.courseId ||
          !!(sp && (await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId: sp.id, courseId: m.courseId } } })));
      } else {
        allowed = true; // teachers/admins of the same institution
      }
    }
  } else if (kind === "submission") {
    const s = await prisma.assignmentSubmission.findUnique({
      where: { id },
      include: { student: true, assignment: { include: { teacher: true } } },
    });
    if (s) {
      filePath = s.filePath;
      fileName = s.fileName;
      allowed =
        s.student.userId === user.id ||
        s.assignment.teacher.userId === user.id ||
        ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") && s.assignment.institutionId === user.institutionId);
    }
  } else if (kind === "message") {
    const m = await prisma.message.findUnique({ where: { id }, include: { conversation: true } });
    if (m) {
      filePath = m.filePath;
      fileName = m.fileName;
      allowed = m.conversation.studentId === user.id || m.conversation.teacherId === user.id;
    }
  } else if (kind === "document") {
    const d = await prisma.document.findUnique({ where: { id } });
    if (d) {
      filePath = d.filePath;
      fileName = d.fileName;
      allowed = d.ownerId === user.id; // private PDFs: owner only
    }
  }

  if (!allowed || !filePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const buf = await readUpload(filePath);
    const safe = encodeURIComponent(fileName || "download");
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${safe}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "File is no longer available" }, { status: 404 });
  }
}
