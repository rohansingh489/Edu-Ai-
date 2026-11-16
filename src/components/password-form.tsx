import { changePassword } from "@/app/actions/account";
import { SubmitButton } from "./submit-button";
import { Field } from "./ui";

export function PasswordForm() {
  return (
    <form action={changePassword} className="card max-w-md space-y-3">
      <h2 className="font-bold text-navy-900">Change password</h2>
      <Field label="Current password"><input name="current" type="password" required autoComplete="current-password" className="input" /></Field>
      <Field label="New password (min 8 characters)"><input name="next" type="password" required minLength={8} autoComplete="new-password" className="input" /></Field>
      <Field label="Confirm new password"><input name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" /></Field>
      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}
