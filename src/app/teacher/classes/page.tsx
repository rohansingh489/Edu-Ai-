import { requireTeacher } from "@/lib/auth";
import { teacherCourses } from "@/lib/teacher";
import { Empty, PageHeader, Table } from "@/components/ui";

export default async function TeacherClasses() {
  const { profile } = await requireTeacher();
  const courses = await teacherCourses(profile.id);
  const byClass = new Map<string, { name: string; subjects: string[]; students: number }>();
  for (const c of courses) {
    const e = byClass.get(c.classSectionId) ?? { name: c.classSection.name, subjects: [], students: 0 };
    e.subjects.push(c.subject.name); e.students = Math.max(e.students, c._count.enrollments);
    byClass.set(c.classSectionId, e);
  }
  return (
    <>
      <PageHeader title="My classes" />
      {byClass.size === 0 ? <Empty>No classes assigned.</Empty> : (
        <Table head={["Class", "Subjects I teach", "Students"]}>
          {Array.from(byClass.values()).map((c) => <tr key={c.name}><td className="td font-medium">{c.name}</td><td className="td">{c.subjects.join(", ")}</td><td className="td">{c.students}</td></tr>)}
        </Table>
      )}
    </>
  );
}
