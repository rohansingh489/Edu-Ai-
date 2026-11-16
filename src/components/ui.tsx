import Link from "next/link";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type SP = { ok?: string; err?: string; [k: string]: string | undefined };

/** Success / error banner driven by ?ok= and ?err= */
export function Flash({ sp }: { sp: SP }) {
  if (!sp?.ok && !sp?.err) return null;
  const ok = !!sp.ok;
  return (
    <div
      role="status"
      className={cn(
        "mb-5 flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm animate-fadeUp",
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      )}
    >
      {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" />}
      <span className="font-medium">{ok ? sp.ok : sp.err}</span>
    </div>
  );
}

/** Page title + optional subtitle + optional right-side action */
export function PageHeader({
  title, subtitle, action, icon,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
            {icon}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Stat card — used on dashboards */
export function StatCard({
  label, value, hint, href, tone = "navy", icon, delta,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  href?: string;
  tone?: "navy" | "blue" | "green" | "amber" | "red" | "violet";
  icon?: React.ReactNode;
  delta?: string; // e.g. "+12 this month"
}) {
  const tones: Record<string, string> = {
    navy:   "bg-navy-50   text-navy-700   ring-navy-100",
    blue:   "bg-blue-50   text-blue-600   ring-blue-100",
    green:  "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber:  "bg-amber-50  text-amber-600  ring-amber-100",
    red:    "bg-red-50    text-red-600    ring-red-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
  };
  const body = (
    <div className="card h-full hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 animate-fadeUp group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        {icon && (
          <span className={cn("rounded-xl p-2 ring-1", tones[tone])}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-extrabold text-navy-900 tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {delta && <p className="mt-1 text-xs font-medium text-emerald-600">{delta}</p>}
      {href && (
        <p className="mt-3 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
          View details →
        </p>
      )}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

/** Coloured badge pill */
export function Badge({
  children, tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "red" | "blue" | "violet" | "navy";
}) {
  const tones: Record<string, string> = {
    slate:  "bg-slate-100  text-slate-700",
    green:  "bg-emerald-100 text-emerald-700",
    amber:  "bg-amber-100  text-amber-700",
    red:    "bg-red-100    text-red-700",
    blue:   "bg-blue-100   text-blue-700",
    violet: "bg-violet-100 text-violet-700",
    navy:   "bg-navy-100   text-navy-700",
  };
  return <span className={cn("badge", tones[tone])}>{children}</span>;
}

export function statusTone(status: string): "slate" | "green" | "amber" | "red" | "blue" {
  switch (status) {
    case "RESOLVED": case "PRESENT": case "READY":   return "green";
    case "IN_PROGRESS": case "LATE": case "PROCESSING": return "blue";
    case "PENDING":   return "amber";
    case "REJECTED": case "ABSENT": case "FAILED":   return "red";
    default:          return "slate";
  }
}

/** Empty state */
export function Empty({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-10 text-center">
      {icon && <span className="mb-3 text-slate-300">{icon}</span>}
      <p className="text-sm text-slate-500">{children}</p>
    </div>
  );
}

/** Data table with sticky header */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50">
          <tr>
            {head.map((h) => (
              <th key={h} className="th">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">{children}</tbody>
      </table>
    </div>
  );
}

/** Attendance / progress bar */
export function Progress({ value, tone }: { value: number; tone?: "green" | "amber" | "red" }) {
  const t = tone ?? (value >= 75 ? "green" : value >= 60 ? "amber" : "red");
  const colors = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={cn("h-full rounded-full transition-all duration-500", colors[t])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/** Labelled form field wrapper */
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

/** Section divider with optional label */
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-slate-100 my-4" />;
  return (
    <div className="flex items-center gap-3 my-4">
      <hr className="flex-1 border-slate-100" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <hr className="flex-1 border-slate-100" />
    </div>
  );
}

/** Blue info alert */
export function InfoAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="info-box rounded-xl">
      <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
      <span>{children}</span>
    </div>
  );
}

/** Quick stats row for college info */
export function MetaRow({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-sm">
          <span className="font-semibold text-navy-900">{value}</span>
          <span className="text-slate-400">{label}</span>
        </div>
      ))}
    </div>
  );
}
