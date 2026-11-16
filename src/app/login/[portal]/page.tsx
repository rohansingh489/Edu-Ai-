import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GraduationCap, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser, homeForRole } from "@/lib/auth";

const PORTALS = {
  student: {
    title: "Student Portal",
    idLabel: "Student ID or Email",
    icon: GraduationCap,
    color: "from-blue-600 to-blue-800",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    ring: "ring-blue-200",
    blurb: "Access your attendance, assignments, results, study materials and AI assistant.",
    hint: "Login with your Student ID (e.g. STU2026001) or your email address.",
  },
  teacher: {
    title: "Faculty Portal",
    idLabel: "Employee ID or Email",
    icon: Users,
    color: "from-emerald-600 to-emerald-800",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    ring: "ring-emerald-200",
    blurb: "Manage your classes, attendance, assignments and student communication.",
    hint: "Login with your Employee ID (e.g. EMP1001) or your email address.",
  },
  admin: {
    title: "Administrator Portal",
    idLabel: "Admin Email or ID",
    icon: ShieldCheck,
    color: "from-violet-600 to-violet-800",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    ring: "ring-violet-200",
    blurb: "Manage students, faculty, academics, examinations and institution settings.",
    hint: "Login with your Admin ID (e.g. ADMIN001) or your email address.",
  },
} as const;

export default async function LoginPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = await params;
  if (!(portal in PORTALS)) notFound();
  const cfg = PORTALS[portal as keyof typeof PORTALS];

  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));

  const Icon = cfg.icon;
  const otherPortals = (["student", "teacher", "admin"] as const).filter((p) => p !== portal);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-900 to-slate-900 flex">
      {/* Left panel — desktop only */}
      <div className={`hidden lg:flex lg:w-2/5 flex-col justify-between p-12 bg-gradient-to-br ${cfg.color} relative overflow-hidden`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white blur-2xl translate-y-1/2 -translate-x-1/2" />
        </div>

        <Link href="/login" className="relative flex items-center gap-3 text-white/90 hover:text-white transition">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 font-extrabold text-xl backdrop-blur-sm">E</span>
          <span className="text-lg font-bold tracking-tight">EduConnect AI</span>
        </Link>

        <div className="relative">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Icon size={32} className="text-white" />
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight text-balance">{cfg.title}</h2>
          <p className="mt-4 text-lg text-white/75 leading-relaxed">{cfg.blurb}</p>
        </div>

        <p className="relative text-sm text-white/40">© 2026 EduConnect AI · All rights reserved</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md animate-fadeUp">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Link href="/login" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 font-extrabold text-white">E</span>
              <span className="font-bold text-white">EduConnect AI</span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-6">
            <div className={`mb-3 inline-flex items-center gap-2 rounded-full ${cfg.iconBg} ring-1 ${cfg.ring} px-3 py-1.5`}>
              <Icon size={15} className={cfg.iconColor} />
              <span className={`text-xs font-semibold ${cfg.iconColor}`}>{cfg.title}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Sign in</h1>
            <p className="mt-1.5 text-sm text-slate-400">{cfg.hint}</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <LoginForm portal={portal as keyof typeof PORTALS} idLabel={cfg.idLabel} />
            <div className="mt-5 flex items-center justify-between text-sm border-t border-slate-700/60 pt-4">
              <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 transition hover:underline">
                Forgot password?
              </Link>
              <Link href="/login" className="text-slate-400 hover:text-slate-300 transition">
                ← All portals
              </Link>
            </div>
          </div>

          {/* Other portals */}
          <div className="mt-6">
            <p className="mb-2 text-xs text-slate-500 text-center">Other portals</p>
            <div className="flex justify-center gap-3">
              {otherPortals.map((p) => {
                const cfg2 = PORTALS[p];
                const Icon2 = cfg2.icon;
                return (
                  <Link
                    key={p}
                    href={`/login/${p}`}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-slate-400 hover:border-white/20 hover:text-slate-200 transition-all"
                  >
                    <Icon2 size={14} />
                    <span className="capitalize">{p === "admin" ? "Admin" : p}</span>
                    <ArrowRight size={12} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
