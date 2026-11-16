import Link from "next/link";
import { PublicPage } from "@/components/site";
import { Flash, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { requestPasswordReset } from "@/app/actions/public";

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  return (
    <PublicPage>
      <section className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-navy-900">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your ID or email. Your institution&apos;s administrator will be notified and will set a new temporary password for you.
        </p>
        <div className="card mt-6">
          <Flash sp={sp} />
          <form action={requestPasswordReset} className="space-y-4">
            <label className="block">
              <span className="label">Student/Employee ID or email</span>
              <input name="identifier" required className="input" />
            </label>
            <SubmitButton className="w-full">Request reset</SubmitButton>
          </form>
          <Link href="/login/student" className="mt-4 block text-center text-sm text-blue-600 hover:underline">Back to login</Link>
        </div>
      </section>
    </PublicPage>
  );
}
