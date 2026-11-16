import { Mail } from "lucide-react";
import { submitContact } from "@/app/actions/public";
import { SubmitButton } from "@/components/submit-button";

export function ContactForm({ redirectTo }: { redirectTo: string }) {
  return (
    <form action={submitContact} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label>
        <span className="label">Name</span>
        <input name="name" required className="input" />
      </label>
      <label>
        <span className="label">Email</span>
        <input name="email" type="email" required className="input" />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Institution (optional)</span>
        <input name="institution" className="input" />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Message</span>
        <textarea name="message" rows={4} required minLength={10} className="input" />
      </label>
      <div className="sm:col-span-2">
        <SubmitButton className="w-full">
          <Mail size={16} /> Send message
        </SubmitButton>
      </div>
    </form>
  );
}
