import { requireTeacher } from "@/lib/auth";
import { Flash, PageHeader, type SP } from "@/components/ui";
import { PasswordForm } from "@/components/password-form";

export default async function TeacherSettings({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user } = await requireTeacher();
  return (<><PageHeader title="Settings" subtitle={`Signed in as ${user.email}`} /><Flash sp={sp} /><PasswordForm /></>);
}
