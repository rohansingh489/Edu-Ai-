import { requireStudent } from "@/lib/auth";
import { Flash, PageHeader, type SP } from "@/components/ui";
import { PasswordForm } from "@/components/password-form";

export default async function StudentSettings({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user } = await requireStudent();
  return (
    <>
      <PageHeader title="Settings" subtitle={`Signed in as ${user.email}`} />
      <Flash sp={sp} />
      <PasswordForm />
    </>
  );
}
