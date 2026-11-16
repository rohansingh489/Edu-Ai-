import { redirect } from "next/navigation";
import { ZodError, type ZodTypeAny, type z } from "zod";

/** Redirect back to a page with a success (?ok=) or error (?err=) banner. Never returns. */
export function flash(path: string, kind: "ok" | "err", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}

/** Parse FormData with a zod schema; on failure redirect back with the first error message. */
export function parseForm<T extends ZodTypeAny>(schema: T, fd: FormData, backTo: string): z.infer<T> {
  const raw: Record<string, unknown> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string") raw[k] = v;
  });
  const r = schema.safeParse(raw);
  if (!r.success) {
    const issue = (r.error as ZodError).issues[0];
    flash(backTo, "err", `${issue.path.join(".") || "Form"}: ${issue.message}`);
  }
  return r.data;
}
