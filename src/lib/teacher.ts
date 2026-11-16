import { prisma } from "./prisma";

export function teacherCourses(teacherId: string) {
  return prisma.course.findMany({
    where: { teachingAssignments: { some: { teacherId } } },
    include: { subject: true, classSection: true, _count: { select: { enrollments: true } } },
    orderBy: { subject: { name: "asc" } },
  });
}
