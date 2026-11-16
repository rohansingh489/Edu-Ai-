import { requireStudent } from "@/lib/auth";
import { PageHeader, Progress } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export default async function StudentProfile() {
  const { user, profile } = await requireStudent();
  const rows: [string, React.ReactNode][] = [
    ["Full name", user.name],
    ["Student ID", user.loginId],
    ["Email", user.email],
    ["Institution", `${profile.institution.name} (${profile.institution.type === "SCHOOL" ? "School" : "College"})`],
    ["Class / Section", profile.classSection?.name ?? "—"],
    ["Course / Program", profile.program?.name ?? "—"],
    ["Semester", profile.semester ?? "—"],
    ["Roll number", profile.rollNo ?? "—"],
    ["Guardian", profile.guardianName ?? "—"],
    ["Phone", profile.phone ?? "—"],
    ["Member since", fmtDate(user.createdAt)],
  ];
  const feePct = profile.feeTotal ? Math.round((profile.feePaid / profile.feeTotal) * 100) : 0;
  return (
    <>
      <PageHeader title="My profile" subtitle="Contact your administrator to change any of these details." />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-5 flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-navy-800 text-2xl font-bold text-white">{user.name[0]}</span>
            <div>
              <p className="text-lg font-bold text-navy-900">{user.name}</p>
              <p className="text-sm text-slate-500">{user.loginId}</p>
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="label">{k}</dt>
                <dd className="text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="card">
          <h2 className="font-bold text-navy-900">Fee status</h2>
          <p className="mt-3 text-sm text-slate-600">Paid ₹{profile.feePaid.toLocaleString("en-IN")} of ₹{profile.feeTotal.toLocaleString("en-IN")}</p>
          <div className="mt-2"><Progress value={feePct} tone={feePct >= 100 ? "green" : "amber"} /></div>
          <p className="mt-2 text-xs text-slate-500">Balance: ₹{(profile.feeTotal - profile.feePaid).toLocaleString("en-IN")}</p>
        </section>
      </div>
    </>
  );
}
