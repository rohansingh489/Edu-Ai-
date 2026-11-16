import { PrismaClient, type AttendanceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_PASSWORD || "Password@123";

const day = (offset: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};

function grade(p: number) {
  return p >= 90 ? "A+" : p >= 80 ? "A" : p >= 70 ? "B+" : p >= 60 ? "B" : p >= 50 ? "C" : p >= 40 ? "D" : "F";
}

async function main() {
  console.log("Resetting demo data…");
  await prisma.auditLog.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, 12);

  // ---------- Super admin (platform level) ----------
  await prisma.user.create({
    data: { role: "SUPER_ADMIN", loginId: "SUPER001", email: "super@educonnect.test", name: "Platform Super Admin", passwordHash: hash },
  });

  // ---------- Institution 1: college ----------
  const college = await prisma.institution.create({
    data: { name: "Sunrise Institute of Technology", code: "SIT", type: "COLLEGE", address: "Lucknow, Uttar Pradesh", email: "info@sit.test" },
  });
  const I = college.id;

  const year = await prisma.academicYear.create({
    data: { institutionId: I, name: "2026-27", startDate: new Date("2026-07-01"), endDate: new Date("2027-05-31"), isCurrent: true },
  });
  const dept = await prisma.department.create({ data: { institutionId: I, name: "Computer Science", code: "CS" } });
  const bca = await prisma.program.create({ data: { institutionId: I, departmentId: dept.id, name: "BCA", durationYears: 3 } });
  const classA = await prisma.classSection.create({ data: { institutionId: I, programId: bca.id, academicYearId: year.id, name: "BCA Sem 3 - A" } });

  await prisma.user.create({
    data: {
      institutionId: I, role: "ADMIN", loginId: "ADMIN001", email: "admin@sit.test", name: "Rohan Singh", passwordHash: hash,
      memberships: { create: { institutionId: I, role: "ADMIN" } },
      adminProfile: { create: { institutionId: I, title: "Principal's Office" } },
    },
  });

  const mkTeacher = (loginId: string, email: string, name: string, designation: string) =>
    prisma.user.create({
      data: {
        institutionId: I, role: "TEACHER", loginId, email, name, passwordHash: hash,
        memberships: { create: { institutionId: I, role: "TEACHER" } },
        teacherProfile: { create: { institutionId: I, departmentId: dept.id, designation } },
      },
      include: { teacherProfile: true },
    });
  const t1 = await mkTeacher("EMP1001", "rajesh@sit.test", "Dr. Rajesh Kumar", "Associate Professor");
  const t2 = await mkTeacher("EMP1002", "priya@sit.test", "Priya Sharma", "Assistant Professor");

  const subjects = await Promise.all(
    [
      ["Database Management Systems", "CS301"],
      ["Data Structures", "CS302"],
      ["Discrete Mathematics", "MA301"],
    ].map(([name, code]) => prisma.subject.create({ data: { institutionId: I, departmentId: dept.id, name, code } }))
  );
  const courses = await Promise.all(subjects.map((s) => prisma.course.create({ data: { institutionId: I, subjectId: s.id, classSectionId: classA.id, semester: 3 } })));
  await prisma.teachingAssignment.createMany({
    data: [
      { institutionId: I, teacherId: t1.teacherProfile!.id, courseId: courses[0].id },
      { institutionId: I, teacherId: t1.teacherProfile!.id, courseId: courses[2].id },
      { institutionId: I, teacherId: t2.teacherProfile!.id, courseId: courses[1].id },
    ],
  });

  const studentSeeds = [
    ["STU2026001", "aarav@sit.test", "Aarav Singh", 80000],
    ["STU2026002", "diya@sit.test", "Diya Gupta", 80000],
    ["STU2026003", "kabir@sit.test", "Kabir Mehta", 80000],
    ["STU2026004", "meera@sit.test", "Meera Nair", 80000],
    ["STU2026005", "rohan@sit.test", "Rohan Das", 80000],
    ["STU2026006", "sara@sit.test", "Sara Khan", 80000],
  ] as const;
  const students = [];
  for (const [i, [loginId, email, name, fee]] of studentSeeds.entries()) {
    const u = await prisma.user.create({
      data: {
        institutionId: I, role: "STUDENT", loginId, email, name, passwordHash: hash,
        memberships: { create: { institutionId: I, role: "STUDENT" } },
        studentProfile: {
          create: { institutionId: I, classSectionId: classA.id, programId: bca.id, rollNo: String(i + 1).padStart(2, "0"), semester: 3, guardianName: `Parent of ${name.split(" ")[0]}`, feeTotal: fee, feePaid: i % 3 === 0 ? fee : fee / 2 },
        },
      },
      include: { studentProfile: true },
    });
    students.push(u);
  }
  for (const s of students) {
    await prisma.enrollment.createMany({ data: courses.map((c) => ({ institutionId: I, studentId: s.studentProfile!.id, courseId: c.id })) });
  }

  // ---------- Attendance: last 12 working days ----------
  const teacherOf = [t1, t2, t1];
  for (let d = 12; d >= 1; d--) {
    for (const [ci, course] of courses.entries()) {
      const session = await prisma.attendanceSession.create({ data: { institutionId: I, courseId: course.id, teacherId: teacherOf[ci].teacherProfile!.id, date: day(-d) } });
      await prisma.attendanceRecord.createMany({
        data: students.map((s, si) => {
          // Rohan (index 4) is deliberately low to demonstrate warnings.
          const absent = si === 4 ? (d + ci) % 2 === 0 : (d * 7 + si * 3 + ci) % 11 === 0;
          const status: AttendanceStatus = absent ? "ABSENT" : (d + si) % 9 === 0 ? "LATE" : "PRESENT";
          return { sessionId: session.id, studentId: s.studentProfile!.id, status };
        }),
      });
    }
  }

  // ---------- Assignments ----------
  const a1 = await prisma.assignment.create({
    data: { institutionId: I, courseId: courses[0].id, teacherId: t1.teacherProfile!.id, title: "ER diagram for a library system", description: "Design an ER diagram for a library management system and normalise it to 3NF. Explain each step.", dueDate: day(5), maxMarks: 20 },
  });
  const a2 = await prisma.assignment.create({
    data: { institutionId: I, courseId: courses[1].id, teacherId: t2.teacherProfile!.id, title: "Implement a stack and queue", description: "Implement both structures using arrays and linked lists in any language. Submit code and a short note on complexity.", dueDate: day(-2), maxMarks: 10 },
  });
  await prisma.assignmentSubmission.create({
    data: { assignmentId: a2.id, studentId: students[0].studentProfile!.id, content: "Implemented in Python. Push/pop O(1); enqueue/dequeue O(1) with linked list.", marks: 9, feedback: "Good work!", gradedAt: new Date() },
  });
  await prisma.assignmentSubmission.create({
    data: { assignmentId: a2.id, studentId: students[1].studentProfile!.id, content: "Array-based stack and queue in Java." },
  });
  void a1;

  // ---------- Exams & results ----------
  const mid = await prisma.examination.create({
    data: { institutionId: I, courseId: courses[0].id, title: "DBMS Mid-term", type: "INTERNAL", date: day(-10), maxMarks: 50, passMarks: 18, resultsPublished: true },
  });
  const mid2 = await prisma.examination.create({
    data: { institutionId: I, courseId: courses[1].id, title: "Data Structures Unit Test 1", type: "INTERNAL", date: day(-6), maxMarks: 30, passMarks: 11, resultsPublished: true },
  });
  await prisma.examination.create({
    data: { institutionId: I, courseId: courses[0].id, title: "DBMS Final Examination", type: "FINAL", date: day(30), maxMarks: 100, passMarks: 35 },
  });
  const marks = [[44, 25], [38, 22], [31, 19], [41, 27], [20, 12], [47, 28]];
  for (const [i, s] of students.entries()) {
    await prisma.studentResult.create({ data: { examinationId: mid.id, studentId: s.studentProfile!.id, marks: marks[i][0], grade: grade((marks[i][0] / 50) * 100) } });
    await prisma.studentResult.create({ data: { examinationId: mid2.id, studentId: s.studentProfile!.id, marks: marks[i][1], grade: grade((marks[i][1] / 30) * 100) } });
  }

  // ---------- Study materials (links only; upload real files from the UI) ----------
  await prisma.studyMaterial.create({
    data: { institutionId: I, courseId: courses[0].id, uploadedById: t1.id, title: "Normalization explained (video)", description: "1NF to BCNF with worked examples.", type: "VIDEO", videoUrl: "https://www.youtube.com/results?search_query=database+normalization" },
  });
  await prisma.studyMaterial.create({
    data: { institutionId: I, courseId: courses[1].id, uploadedById: t2.id, title: "Data Structures reading list", description: "Recommended chapters and practice problems.", type: "NOTES", videoUrl: "https://www.geeksforgeeks.org/data-structures/" },
  });

  // ---------- Messaging, complaint, announcement, notifications ----------
  const convo = await prisma.conversation.create({
    data: { institutionId: I, studentId: students[0].id, teacherId: t1.id, courseId: courses[0].id, subject: "Doubt on 3NF" },
  });
  await prisma.message.create({ data: { conversationId: convo.id, senderId: students[0].id, body: "Sir, is a transitive dependency always a violation of 3NF?" } });

  await prisma.complaint.create({
    data: {
      ticket: "CMP-2026-0001", institutionId: I, studentId: students[4].id, category: "ATTENDANCE", title: "Attendance not updated for 12 Oct",
      description: "I was present on 12 Oct for all lectures but it is shown as absent in my record. Please verify.",
      history: [{ at: new Date().toISOString(), status: "PENDING", note: "Complaint submitted", by: students[4].name }],
    },
  });
  const admin = await prisma.user.findFirstOrThrow({ where: { institutionId: I, role: "ADMIN" } });
  await prisma.announcement.create({
    data: { institutionId: I, authorId: admin.id, title: "Welcome to EduConnect AI", body: "Your new all-in-one portal is live. Explore EduBot and Chat with Your PDF from your dashboard.", audience: "ALL" },
  });
  const everyone = await prisma.user.findMany({ where: { institutionId: I, role: { in: ["STUDENT", "TEACHER"] } }, select: { id: true } });
  await prisma.notification.createMany({
    data: [
      ...everyone.map((u) => ({ userId: u.id, institutionId: I, type: "ANNOUNCEMENT" as const, title: "Welcome to EduConnect AI", body: "Your portal is live.", link: "/" })),
      { userId: students[4].id, institutionId: I, type: "ATTENDANCE" as const, title: "Attendance warning", body: "Your attendance has dropped below 75%.", link: "/student/attendance" },
      { userId: t1.id, institutionId: I, type: "MESSAGE" as const, title: `New message from ${students[0].name}`, body: "Sir, is a transitive dependency…", link: `/teacher/messages?c=${convo.id}` },
      { userId: admin.id, institutionId: I, type: "COMPLAINT" as const, title: "New complaint CMP-2026-0001", body: "Attendance not updated for 12 Oct", link: "/admin/complaints" },
    ],
  });

  // ---------- Institution 2: school (to demo multi-tenant isolation) ----------
  const school = await prisma.institution.create({ data: { name: "Greenfield Public School", code: "GPS", type: "SCHOOL", address: "Pune, Maharashtra" } });
  const g10 = await prisma.gradeLevel.create({ data: { institutionId: school.id, name: "Class 10", sortOrder: 10 } });
  const sec = await prisma.classSection.create({ data: { institutionId: school.id, gradeLevelId: g10.id, name: "Class 10-A" } });
  await prisma.user.create({
    data: {
      institutionId: school.id, role: "ADMIN", loginId: "ADMIN002", email: "admin@gps.test", name: "Sunil Patil", passwordHash: hash,
      memberships: { create: { institutionId: school.id, role: "ADMIN" } },
      adminProfile: { create: { institutionId: school.id, title: "Administrator" } },
    },
  });
  const sch = await prisma.user.create({
    data: {
      institutionId: school.id, role: "STUDENT", loginId: "GPS10A01", email: "ishaan@gps.test", name: "Ishaan Joshi", passwordHash: hash,
      memberships: { create: { institutionId: school.id, role: "STUDENT" } },
      studentProfile: { create: { institutionId: school.id, classSectionId: sec.id, rollNo: "01", feeTotal: 40000, feePaid: 40000 } },
    },
  });
  void sch;

  console.log("\nSeed complete. All demo accounts use password:", PASSWORD);
  console.log("  Super admin : SUPER001 / super@educonnect.test   (Admin portal)");
  console.log("  Admin       : ADMIN001 / admin@sit.test          (Admin portal)");
  console.log("  Teacher     : EMP1001  / rajesh@sit.test         (Teacher portal)");
  console.log("  Teacher     : EMP1002  / priya@sit.test          (Teacher portal)");
  console.log("  Student     : STU2026001 / aarav@sit.test        (Student portal)");
  console.log("  School admin: ADMIN002 / admin@gps.test          (Admin portal)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
