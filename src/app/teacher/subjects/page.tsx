import { requireTeacher } from "@/lib/auth";
import { teacherCourses } from "@/lib/teacher";
import { Empty, PageHeader, Table } from "@/components/ui";

export default async function TeacherSubjects() {
  const { profile } = await requireTeacher();
  const courses = await teacherCourses(profile.id);
  return (
    <>
      <PageHeader title="My subjects" />
      {courses.length === 0 ? <Empty>No subjects assigned.</Empty> : (
        <Table head={["Subject", "Code", "Class", "Semester", "Students"]}>
          {courses.map((c) => <tr key={c.id}><td className="td font-medium">{c.subject.name}</td><td className="td">{c.subject.code ?? "—"}</td><td className="td">{c.classSection.name}</td><td className="td">{c.semester ?? "—"}</td><td className="td">{c._count.enrollments}</td></tr>)}
        </Table>
      )}
    </>
  );
}
