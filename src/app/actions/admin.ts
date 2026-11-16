"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { INSTITUTION_COOKIE, hashPassword, requireAdmin } from "@/lib/auth";
import { flash, parseForm } from "@/lib/flash";
import { audit, notifyUsers } from "@/lib/notify";
import { sendPasswordResetEmail, sendSMS, sendWelcomeEmail } from "@/lib/comms";
import { audienceUserIds, enrollClassInCourse, enrollStudentInClass, isUniqueError, must, optId, optText, reqId } from "@/lib/helpers";

const DUP = "That ID or email is already in use.";

// ======================= Students & teachers =======================
const baseUser = {
  name: z.string().trim().min(2, "Enter the full name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  loginId: z.string().trim().min(3, "ID must be at least 3 characters").max(40).regex(/^[A-Za-z0-9._-]+$/, "ID may only contain letters, numbers . _ -"),
  phone: optText(30),
};

const studentSchema = z.object({
  ...baseUser,
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  classSectionId: optId,
  programId: optId,
  rollNo: optText(30),
  semester: z.coerce.number().int().min(1).max(12).optional().or(z.literal("").transform(() => undefined)),
  guardianName: optText(100),
  feeTotal: z.coerce.number().int().min(0).default(0),
});

export async function createStudent(fd: FormData) {
  const { user: admin, institutionId } = await requireAdmin();
  const back = "/admin/students";
  const d = parseForm(studentSchema, fd, back);
  if (d.classSectionId) must(await prisma.classSection.findFirst({ where: { id: d.classSectionId, institutionId } }), back, "Class not found.");
  if (d.programId) must(await prisma.program.findFirst({ where: { id: d.programId, institutionId } }), back, "Program not found.");

  // Check specifically for duplicate loginId or email before creating
  const existingLogin = await prisma.user.findFirst({
    where: { loginId: { equals: d.loginId, mode: "insensitive" } },
    select: { name: true, loginId: true },
  });
  if (existingLogin) {
    flash(back, "err", `Student ID "${d.loginId}" is already registered to ${existingLogin.name}. Please enter a unique Student ID.`);
  }

  const existingEmail = await prisma.user.findFirst({
    where: { email: { equals: d.email, mode: "insensitive" } },
    select: { name: true, email: true },
  });
  if (existingEmail) {
    flash(back, "err", `Email "${d.email}" is already registered to ${existingEmail.name}. Please enter a different email address.`);
  }

  let createdId: string | null = null;
  try {
    const u = await prisma.user.create({
      data: {
        institutionId,
        role: "STUDENT",
        name: d.name,
        email: d.email,
        loginId: d.loginId,
        passwordHash: await hashPassword(d.password),
        memberships: { create: { institutionId, role: "STUDENT" } },
        studentProfile: {
          create: {
            institutionId,
            classSectionId: d.classSectionId,
            programId: d.programId,
            rollNo: d.rollNo,
            semester: d.semester as number | undefined,
            guardianName: d.guardianName,
            phone: d.phone,
            feeTotal: d.feeTotal,
          },
        },
      },
      include: { studentProfile: true },
    });
    createdId = u.id;
    if (u.studentProfile && d.classSectionId) await enrollStudentInClass(u.studentProfile.id, d.classSectionId, institutionId);

    // Dispatch real welcome email and SMS
    sendWelcomeEmail({
      to: d.email,
      name: d.name,
      role: "STUDENT",
      loginId: d.loginId,
      password: d.password,
    }).catch((err) => console.error("[STUDENT WELCOME EMAIL ERR]", err));

    if (d.phone) {
      sendSMS({
        phone: d.phone,
        name: d.name,
        message: `Welcome to EduConnect AI, ${d.name}! Your Student ID is ${d.loginId} and Password is ${d.password}. Log in at http://localhost:3000/login/student`,
      }).catch((err) => console.error("[STUDENT WELCOME SMS ERR]", err));
    }
  } catch (e: any) {
    if (isUniqueError(e)) {
      const target = e?.meta?.target;
      if (Array.isArray(target) && target.includes("loginId")) {
        flash(back, "err", `Student ID "${d.loginId}" is already in use. Please enter a different ID.`);
      }
      if (Array.isArray(target) && target.includes("email")) {
        flash(back, "err", `Email "${d.email}" is already in use. Please enter a different email address.`);
      }
      flash(back, "err", "A student with this ID or email already exists. Please use unique values.");
    }
    throw e;
  }
  await audit(admin.id, institutionId, "STUDENT_CREATED", "User", createdId ?? undefined);
  flash(back, "ok", `Student ${d.name} created.`);
}

const teacherSchema = z.object({
  ...baseUser,
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  departmentId: optId,
  designation: optText(100),
});

export async function createTeacher(fd: FormData) {
  const { user: admin, institutionId } = await requireAdmin();
  const back = "/admin/teachers";
  const d = parseForm(teacherSchema, fd, back);
  if (d.departmentId) must(await prisma.department.findFirst({ where: { id: d.departmentId, institutionId } }), back, "Department not found.");

  // Check specifically for duplicate loginId or email before creating
  const existingLogin = await prisma.user.findFirst({
    where: { loginId: { equals: d.loginId, mode: "insensitive" } },
    select: { name: true, loginId: true },
  });
  if (existingLogin) {
    flash(back, "err", `Employee ID "${d.loginId}" is already registered to ${existingLogin.name}. Please enter a unique Employee ID (e.g. EMP1003).`);
  }

  const existingEmail = await prisma.user.findFirst({
    where: { email: { equals: d.email, mode: "insensitive" } },
    select: { name: true, email: true },
  });
  if (existingEmail) {
    flash(back, "err", `Email "${d.email}" is already registered to ${existingEmail.name}. Please enter a different email address.`);
  }

  let createdId: string | null = null;
  try {
    const u = await prisma.user.create({
      data: {
        institutionId,
        role: "TEACHER",
        name: d.name,
        email: d.email,
        loginId: d.loginId,
        passwordHash: await hashPassword(d.password),
        memberships: { create: { institutionId, role: "TEACHER" } },
        teacherProfile: { create: { institutionId, departmentId: d.departmentId, designation: d.designation, phone: d.phone } },
      },
    });
    createdId = u.id;

    // Dispatch real welcome email and SMS
    sendWelcomeEmail({
      to: d.email,
      name: d.name,
      role: "TEACHER",
      loginId: d.loginId,
      password: d.password,
    }).catch((err) => console.error("[TEACHER WELCOME EMAIL ERR]", err));

    if (d.phone) {
      sendSMS({
        phone: d.phone,
        name: d.name,
        message: `Welcome to EduConnect AI, ${d.name}! Your Faculty ID is ${d.loginId} and Password is ${d.password}. Log in at http://localhost:3000/login/teacher`,
      }).catch((err) => console.error("[TEACHER WELCOME SMS ERR]", err));
    }
  } catch (e: any) {
    if (isUniqueError(e)) {
      const target = e?.meta?.target;
      if (Array.isArray(target) && target.includes("loginId")) {
        flash(back, "err", `Employee ID "${d.loginId}" is already in use. Please enter a different Employee ID.`);
      }
      if (Array.isArray(target) && target.includes("email")) {
        flash(back, "err", `Email "${d.email}" is already in use. Please enter a different email address.`);
      }
      flash(back, "err", "A teacher with this Employee ID or email already exists. Please use unique values.");
    }
    throw e;
  }
  await audit(admin.id, institutionId, "TEACHER_CREATED", "User", createdId ?? undefined);
  flash(back, "ok", `Teacher ${d.name} created.`);
}

const updateStudentSchema = z.object({
  userId: reqId("User"),
  name: baseUser.name,
  email: baseUser.email,
  phone: baseUser.phone,
  classSectionId: optId,
  programId: optId,
  rollNo: optText(30),
  semester: z.coerce.number().int().min(1).max(12).optional().or(z.literal("").transform(() => undefined)),
  guardianName: optText(100),
});

export async function updateStudent(fd: FormData) {
  const { user: admin, institutionId } = await requireAdmin();
  const d = parseForm(updateStudentSchema, fd, "/admin/students");
  const back = `/admin/students/${d.userId}`;
  const sp = must(
    await prisma.studentProfile.findFirst({ where: { userId: d.userId, institutionId } }),
    "/admin/students",
    "Student not found."
  );
  if (d.classSectionId) must(await prisma.classSection.findFirst({ where: { id: d.classSectionId, institutionId } }), back, "Class not found.");
  let dup = false;
  try {
    await prisma.user.update({ where: { id: d.userId }, data: { name: d.name, email: d.email } });
    await prisma.studentProfile.update({
      where: { id: sp.id },
      data: {
        phone: d.phone ?? null,
        classSectionId: d.classSectionId ?? null,
        programId: d.programId ?? null,
        rollNo: d.rollNo ?? null,
        semester: (d.semester as number | undefined) ?? null,
        guardianName: d.guardianName ?? null,
      },
    });
  } catch (e) {
    if (isUniqueError(e)) dup = true;
    else throw e;
  }
  if (dup) flash(back, "err", "That email is already in use.");
  if (d.classSectionId && d.classSectionId !== sp.classSectionId) await enrollStudentInClass(sp.id, d.classSectionId, institutionId);
  await audit(admin.id, institutionId, "STUDENT_UPDATED", "User", d.userId);
  flash(back, "ok", "Student updated.");
}

const updateTeacherSchema = z.object({
  userId: reqId("User"),
  name: baseUser.name,
  email: baseUser.email,
  phone: baseUser.phone,
  departmentId: optId,
  designation: optText(100),
});

export async function updateTeacher(fd: FormData) {
  const { user: admin, institutionId } = await requireAdmin();
  const d = parseForm(updateTeacherSchema, fd, "/admin/teachers");
  const back = `/admin/teachers/${d.userId}`;
  const tp = must(await prisma.teacherProfile.findFirst({ where: { userId: d.userId, institutionId } }), "/admin/teachers", "Teacher not found.");
  let dup = false;
  try {
    await prisma.user.update({ where: { id: d.userId }, data: { name: d.name, email: d.email } });
    await prisma.teacherProfile.update({
      where: { id: tp.id },
      data: { phone: d.phone ?? null, departmentId: d.departmentId ?? null, designation: d.designation ?? null },
    });
  } catch (e) {
    if (isUniqueError(e)) dup = true;
    else throw e;
  }
  if (dup) flash(back, "err", "That email is already in use.");
  await audit(admin.id, institutionId, "TEACHER_UPDATED", "User", d.userId);
  flash(back, "ok", "Teacher updated.");
}

/** Activate / deactivate a student or teacher. Accounts are never hard-deleted. */
export async function setUserActive(fd: FormData) {
  const { user: admin, institutionId } = await requireAdmin();
  const userId = String(fd.get("userId") || "");
  const active = fd.get("active") === "true";
  const back = String(fd.get("back") || "/admin/dashboard");
  const safeBack = /^\/admin\/(students|teachers)(\/[0-9a-f-]+)?$/.test(back) ? back : "/admin/dashboard";
  const target = must(
    await prisma.user.findFirst({ where: { id: userId, institutionId, role: { in: ["STUDENT", "TEACHER"] } } }),
    safeBack,
    "User not found."
  );
  await prisma.user.update({ where: { id: target.id }, data: { isActive: active } });
  await audit(admin.id, institutionId, active ? "USER_ACTIVATED" : "USER_DEACTIVATED", "User", target.id);
  flash(safeBack, "ok", `${target.name} ${active ? "activated" : "deactivated"}.`);
}

const resetSchema = z.object({ userId: reqId("User"), password: z.string().min(8, "Password must be at least 8 characters").max(100) });

export async function adminResetPassword(fd: FormData) {
  const { user: admin, institutionId } = await requireAdmin();
  const d = parseForm(resetSchema, fd, "/admin/dashboard");
  const target = must(
    await prisma.user.findFirst({ where: { id: d.userId, institutionId, role: { in: ["STUDENT", "TEACHER"] } } }),
    "/admin/dashboard",
    "User not found."
  );
  const back = `/admin/${target.role === "STUDENT" ? "students" : "teachers"}/${target.id}`;
  await prisma.user.update({ where: { id: target.id }, data: { passwordHash: await hashPassword(d.password) } });
  await audit(admin.id, institutionId, "PASSWORD_RESET_BY_ADMIN", "User", target.id);

  // Dispatch real password reset email & SMS
  sendPasswordResetEmail({
    to: target.email,
    name: target.name,
    newPassword: d.password,
  }).catch((err) => console.error("[RESET EMAIL ERR]", err));

  try {
    const profile = target.role === "STUDENT"
      ? await prisma.studentProfile.findUnique({ where: { userId: target.id }, select: { phone: true } })
      : await prisma.teacherProfile.findUnique({ where: { userId: target.id }, select: { phone: true } });

    if (profile?.phone) {
      sendSMS({
        phone: profile.phone,
        name: target.name,
        message: `Your EduConnect AI password has been reset. New temporary password: ${d.password}. Please log in and change your password.`,
      }).catch((err) => console.error("[RESET SMS ERR]", err));
    }
  } catch (err) {
    console.error("[RESET SMS PROFILE LOOKUP ERR]", err);
  }

  flash(back, "ok", `Password reset for ${target.name}. A notification email has been dispatched.`);
}

const feeSchema = z.object({ userId: reqId("User"), feeTotal: z.coerce.number().int().min(0), feePaid: z.coerce.number().int().min(0) });

export async function updateFees(fd: FormData) {
  const { user: admin, institutionId } = await requireAdmin();
  const d = parseForm(feeSchema, fd, "/admin/students");
  const back = `/admin/students/${d.userId}`;
  if (d.feePaid > d.feeTotal) flash(back, "err", "Paid amount cannot exceed total fees.");
  const sp = must(await prisma.studentProfile.findFirst({ where: { userId: d.userId, institutionId } }), "/admin/students");
  await prisma.studentProfile.update({ where: { id: sp.id }, data: { feeTotal: d.feeTotal, feePaid: d.feePaid } });
  await audit(admin.id, institutionId, "FEES_UPDATED", "User", d.userId);
  flash(back, "ok", "Fee record updated.");
}

// ======================= Academic structure =======================
export async function createDepartment(fd: FormData) {
  const { institutionId } = await requireAdmin();
  const back = "/admin/departments";
  const d = parseForm(z.object({ name: z.string().trim().min(2).max(100), code: optText(20) }), fd, back);
  let dup = false;
  try {
    await prisma.department.create({ data: { institutionId, ...d } });
  } catch (e) {
    if (isUniqueError(e)) dup = true;
    else throw e;
  }
  if (dup) flash(back, "err", "A department with this name already exists.");
  flash(back, "ok", "Department created.");
}

export async function createProgram(fd: FormData) {
  const { institutionId } = await requireAdmin();
  const back = "/admin/departments";
  const d = parseForm(z.object({ name: z.string().trim().min(2).max(100), departmentId: optId, durationYears: z.coerce.number().int().min(1).max(8) }), fd, back);
  if (d.departmentId) must(await prisma.department.findFirst({ where: { id: d.departmentId, institutionId } }), back);
  let dup = false;
  try {
    await prisma.program.create({ data: { institutionId, ...d } });
  } catch (e) {
    if (isUniqueError(e)) dup = true;
    else throw e;
  }
  if (dup) flash(back, "err", "A program with this name already exists.");
  flash(back, "ok", "Program created.");
}

export async function createGradeLevel(fd: FormData) {
  const { institutionId } = await requireAdmin();
  const back = "/admin/classes";
  const d = parseForm(z.object({ name: z.string().trim().min(1).max(50), sortOrder: z.coerce.number().int().min(0).default(0) }), fd, back);
  let dup = false;
  try {
    await prisma.gradeLevel.create({ data: { institutionId, ...d } });
  } catch (e) {
    if (isUniqueError(e)) dup = true;
    else throw e;
  }
  if (dup) flash(back, "err", "This grade level already exists.");
  flash(back, "ok", "Grade level created.");
}

export async function createClassSection(fd: FormData) {
  const { institutionId } = await requireAdmin();
  const back = "/admin/classes";
  const d = parseForm(z.object({ name: z.string().trim().min(2).max(80), gradeLevelId: optId, programId: optId, academicYearId: optId }), fd, back);
  let dup = false;
  try {
    await prisma.classSection.create({ data: { institutionId, ...d } });
  } catch (e) {
    if (isUniqueError(e)) dup = true;
    else throw e;
  }
  if (dup) flash(back, "err", "A class with this name already exists.");
  flash(back, "ok", "Class created.");
}

export async function createAcademicYear(fd: FormData) {
  const { institutionId } = await requireAdmin();
  const back = "/admin/settings";
  const d = parseForm(
    z.object({ name: z.string().trim().min(4).max(30), startDate: z.string().min(1), endDate: z.string().min(1), isCurrent: z.string().optional() }),
    fd,
    back
  );
  const start = new Date(d.startDate);
  const end = new Date(d.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) flash(back, "err", "End date must be after the start date.");
  const current = d.isCurrent === "on";
  if (current) await prisma.academicYear.updateMany({ where: { institutionId }, data: { isCurrent: false } });
  await prisma.academicYear.create({ data: { institutionId, name: d.name, startDate: start, endDate: end, isCurrent: current } });
  flash(back, "ok", "Academic session created.");
}

export async function createSubject(fd: FormData) {
  const { institutionId } = await requireAdmin();
  const back = "/admin/subjects";
  const d = parseForm(z.object({ name: z.string().trim().min(2).max(100), code: optText(20), departmentId: optId }), fd, back);
  let dup = false;
  try {
    await prisma.subject.create({ data: { institutionId, ...d } });
  } catch (e) {
    if (isUniqueError(e)) dup = true;
    else throw e;
  }
  if (dup) flash(back, "err", "A subject with this name already exists.");
  flash(back, "ok", "Subject created.");
}

/** Offer a subject to a class and (optionally) assign its teacher. Enrols the class's students. */
export async function createCourse(fd: FormData) {
  const { institutionId } = await requireAdmin();
  const back = "/admin/subjects";
  const d = parseForm(
    z.object({
      subjectId: reqId("Subject"),
      classSectionId: reqId("Class"),
      teacherUserId: optId,
      semester: z.coerce.number().int().min(1).max(12).optional().or(z.literal("").transform(() => undefined)),
    }),
    fd,
    back
  );
  must(await prisma.subject.findFirst({ where: { id: d.subjectId, institutionId } }), back, "Subject not found.");
  must(await prisma.classSection.findFirst({ where: { id: d.classSectionId, institutionId } }), back, "Class not found.");
  const teacher = d.teacherUserId
    ? must(await prisma.teacherProfile.findFirst({ where: { userId: d.teacherUserId, institutionId } }), back, "Teacher not found.")
    : null;
  let course;
  try {
    course = await prisma.course.create({
      data: { institutionId, subjectId: d.subjectId, classSectionId: d.classSectionId, semester: d.semester as number | undefined },
    });
  } catch (e) {
    if (isUniqueError(e)) flash(back, "err", "This subject is already offered to that class. Use 'Change teacher' instead.");
    throw e;
  }
  if (teacher) await prisma.teachingAssignment.create({ data: { institutionId, teacherId: teacher.id, courseId: course.id } });
  await enrollClassInCourse(course.id, d.classSectionId, institutionId);
  flash(back, "ok", "Subject offered to class.");
}

export async function assignTeacher(fd: FormData) {
  const { institutionId } = await requireAdmin();
  const back = "/admin/subjects";
  const d = parseForm(z.object({ courseId: reqId("Course"), teacherUserId: reqId("Teacher") }), fd, back);
  const course = must(await prisma.course.findFirst({ where: { id: d.courseId, institutionId } }), back);
  const teacher = must(await prisma.teacherProfile.findFirst({ where: { userId: d.teacherUserId, institutionId } }), back, "Teacher not found.");
  await prisma.teachingAssignment.deleteMany({ where: { courseId: course.id } });
  await prisma.teachingAssignment.create({ data: { institutionId, teacherId: teacher.id, courseId: course.id } });
  flash(back, "ok", "Teacher assigned.");
}

// ======================= Examinations =======================
const examSchema = z.object({
  courseId: reqId("Course"),
  title: z.string().trim().min(3).max(150),
  type: z.enum(["INTERNAL", "FINAL"]),
  date: z.string().min(1, "Choose a date"),
  maxMarks: z.coerce.number().int().min(1).max(1000),
  passMarks: z.coerce.number().int().min(0).max(1000),
});

export async function createExamAdmin(fd: FormData) {
  const { institutionId } = await requireAdmin();
  const back = "/admin/examinations";
  const d = parseForm(examSchema, fd, back);
  if (d.passMarks > d.maxMarks) flash(back, "err", "Pass marks cannot exceed maximum marks.");
  const course = must(
    await prisma.course.findFirst({
      where: { id: d.courseId, institutionId },
      include: { subject: true, enrollments: { include: { student: { select: { userId: true } } } } },
    }),
    back,
    "Course not found."
  );
  await prisma.examination.create({
    data: { institutionId, courseId: d.courseId, title: d.title, type: d.type, date: new Date(d.date), maxMarks: d.maxMarks, passMarks: d.passMarks },
  });
  await notifyUsers(course.enrollments.map((e) => e.student.userId), institutionId, {
    type: "EXAM",
    title: `Exam scheduled: ${d.title}`,
    body: `${course.subject.name} on ${new Date(d.date).toLocaleDateString("en-IN")}`,
    link: "/student/results",
  });
  flash(back, "ok", "Examination scheduled and students notified.");
}

// ======================= Complaints =======================
const complaintSchema = z.object({
  id: reqId("Complaint"),
  status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"]),
  response: optText(3000),
});

export async function updateComplaint(fd: FormData) {
  const { user: admin, institutionId } = await requireAdmin();
  const back = "/admin/complaints";
  const d = parseForm(complaintSchema, fd, back);
  const c = must(await prisma.complaint.findFirst({ where: { id: d.id, institutionId } }), back, "Complaint not found.");
  if ((d.status === "RESOLVED" || d.status === "REJECTED") && !d.response) flash(back, "err", "Add a response before resolving or rejecting.");
  const history = (Array.isArray(c.history) ? c.history : []) as Record<string, string>[];
  await prisma.complaint.update({
    where: { id: c.id },
    data: {
      status: d.status,
      response: d.response ?? c.response,
      assignedAdminId: c.assignedAdminId ?? admin.id,
      history: [...history, { at: new Date().toISOString(), status: d.status, note: d.response || `Status changed to ${d.status}`, by: admin.name }],
    },
  });
  await notifyUsers([c.studentId], institutionId, {
    type: "COMPLAINT",
    title: `Complaint ${c.ticket}: ${d.status.replace("_", " ").toLowerCase()}`,
    body: d.response?.slice(0, 140) || c.title,
    link: "/student/complaints",
  });
  flash(back, "ok", `Complaint ${c.ticket} updated.`);
}

// ======================= Announcements =======================
export async function publishAnnouncementAdmin(fd: FormData) {
  const { user, institutionId } = await requireAdmin();
  const back = "/admin/announcements";
  const d = parseForm(z.object({ title: z.string().trim().min(3).max(150), body: z.string().trim().min(5).max(3000), audience: z.string().min(1) }), fd, back);
  if (!["ALL", "STUDENT", "TEACHER"].includes(d.audience)) {
    must(await prisma.classSection.findFirst({ where: { id: d.audience, institutionId } }), back, "Class not found.");
  }
  await prisma.announcement.create({ data: { institutionId, authorId: user.id, title: d.title, body: d.body, audience: d.audience } });
  await notifyUsers(await audienceUserIds(institutionId, d.audience), institutionId, {
    type: "ANNOUNCEMENT",
    title: d.title,
    body: d.body.slice(0, 140),
    link: "/student/notifications",
  });
  flash(back, "ok", "Announcement published.");
}

// ======================= Institutions =======================
export async function updateInstitution(fd: FormData) {
  const { user, institutionId } = await requireAdmin();
  const back = "/admin/settings";
  const d = parseForm(
    z.object({ name: z.string().trim().min(2).max(150), address: optText(300), email: optText(150), phone: optText(30), type: z.enum(["SCHOOL", "COLLEGE"]) }),
    fd,
    back
  );
  await prisma.institution.update({ where: { id: institutionId }, data: d });
  await audit(user.id, institutionId, "INSTITUTION_UPDATED", "Institution", institutionId);
  flash(back, "ok", "Institution details saved.");
}

export async function createInstitution(fd: FormData) {
  const { user, isSuper } = await requireAdmin();
  const back = "/admin/institutions";
  if (!isSuper) flash(back, "err", "Only the platform Super Admin can create institutions.");
  const d = parseForm(
    z.object({
      name: z.string().trim().min(2).max(150),
      code: z.string().trim().toUpperCase().min(2).max(20).regex(/^[A-Z0-9_-]+$/, "Code: letters, numbers, - and _ only"),
      type: z.enum(["SCHOOL", "COLLEGE"]),
      address: optText(300),
      adminName: z.string().trim().min(2).max(100),
      adminEmail: z.string().trim().toLowerCase().email(),
      adminLoginId: baseUser.loginId,
      adminPassword: z.string().min(8).max(100),
    }),
    fd,
    back
  );
  let dup = false;
  try {
    const inst = await prisma.institution.create({ data: { name: d.name, code: d.code, type: d.type, address: d.address } });
    await prisma.user.create({
      data: {
        institutionId: inst.id,
        role: "ADMIN",
        name: d.adminName,
        email: d.adminEmail,
        loginId: d.adminLoginId,
        passwordHash: await hashPassword(d.adminPassword),
        memberships: { create: { institutionId: inst.id, role: "ADMIN" } },
        adminProfile: { create: { institutionId: inst.id, title: "Administrator" } },
      },
    });
    await audit(user.id, inst.id, "INSTITUTION_CREATED", "Institution", inst.id);
  } catch (e) {
    if (isUniqueError(e)) dup = true;
    else throw e;
  }
  if (dup) flash(back, "err", "Institution code, admin email or admin ID already exists.");
  flash(back, "ok", `Institution ${d.name} created with its administrator.`);
}

export async function switchInstitution(fd: FormData) {
  const { isSuper } = await requireAdmin();
  const id = String(fd.get("institutionId") || "");
  if (!isSuper) flash("/admin/dashboard", "err", "Not allowed.");
  const inst = must(await prisma.institution.findUnique({ where: { id } }), "/admin/institutions");
  const jar = await cookies();
  jar.set(INSTITUTION_COOKIE, inst.id, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
  flash("/admin/dashboard", "ok", `Now managing ${inst.name}.`);
}

export async function sendTestNotification(fd: FormData) {
  const { user } = await requireAdmin();
  const back = "/admin/settings";
  const testEmail = String(fd.get("testEmail") || "").trim();
  const testPhone = String(fd.get("testPhone") || "").trim();
  const testMessage = String(fd.get("testMessage") || "Test notification from EduConnect AI").trim();

  if (!testEmail && !testPhone) {
    flash(back, "err", "Please provide at least a test email or phone number.");
  }

  const results: string[] = [];

  if (testEmail) {
    try {
      await sendWelcomeEmail({
        to: testEmail,
        name: user.name,
        role: "ADMIN",
        loginId: user.loginId,
        password: "YourPasswordHere",
      });
      results.push(`Email sent to ${testEmail}`);
    } catch (e: any) {
      results.push(`Email error: ${e.message}`);
    }
  }

  if (testPhone) {
    try {
      await sendSMS({
        phone: testPhone,
        name: user.name,
        message: `${testMessage} - EduConnect AI Live Test Alert`,
      });
      results.push(`SMS dispatched to ${testPhone}`);
    } catch (e: any) {
      results.push(`SMS error: ${e.message}`);
    }
  }

  flash(back, "ok", results.join(" · "));
}

export async function toggleInstitution(fd: FormData) {
  const { isSuper } = await requireAdmin();
  if (!isSuper) flash("/admin/dashboard", "err", "Not allowed.");
  const id = String(fd.get("institutionId") || "");
  const inst = must(await prisma.institution.findUnique({ where: { id } }), "/admin/institutions");
  await prisma.institution.update({ where: { id }, data: { isActive: !inst.isActive } });
  flash("/admin/institutions", "ok", `${inst.name} ${inst.isActive ? "deactivated" : "activated"}.`);
}
