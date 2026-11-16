import Link from "next/link";
import { GraduationCap, Users, ShieldCheck, BookOpen, Award, Zap } from "lucide-react";

const portals = [
  {
    href: "/login/student",
    icon: GraduationCap,
    label: "Student Portal",
    desc: "Access attendance, assignments, results, AI study assistant and more.",
    color: "from-blue-500 to-blue-700",
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
    borderHover: "hover:border-blue-400 hover:shadow-blue-100",
  },
  {
    href: "/login/teacher",
    icon: Users,
    label: "Faculty Portal",
    desc: "Manage classes, attendance, assignments, and communicate with students.",
    color: "from-emerald-500 to-emerald-700",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    borderHover: "hover:border-emerald-400 hover:shadow-emerald-100",
  },
  {
    href: "/login/admin",
    icon: ShieldCheck,
    label: "Administrator Portal",
    desc: "Full control: students, faculty, academics, reports and institution settings.",
    color: "from-violet-500 to-violet-700",
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
    borderHover: "hover:border-violet-400 hover:shadow-violet-100",
  },
];

const features = [
  { icon: BookOpen, label: "Smart Study Assistant" },
  { icon: Award, label: "Academic Tracking" },
  { icon: Zap, label: "Real-time Updates" },
];

export default function LoginPortalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-900 to-blue-950 flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Logo & Title */}
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-extrabold text-xl shadow-lg shadow-blue-500/30">
              E
            </span>
            <span className="text-2xl font-extrabold text-white tracking-tight">EduConnect AI</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white leading-tight">
            Your Campus,<br />
            <span className="text-blue-400">All in One Place.</span>
          </h1>
          <p className="mt-3 text-slate-400 text-sm max-w-xs mx-auto">
            Choose your portal to access your personalised dashboard
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
          {features.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300 border border-white/10">
              <Icon size={12} />
              {label}
            </span>
          ))}
        </div>

        {/* Portal cards */}
        <div className="space-y-3">
          {portals.map(({ href, icon: Icon, label, desc, bg, iconColor, borderHover }) => (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-4 rounded-2xl bg-white/95 border border-transparent p-4 shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${borderHover}`}
            >
              <span className={`grid h-13 w-13 shrink-0 place-items-center rounded-xl ${bg} transition-all duration-200 group-hover:scale-110`}>
                <Icon size={26} className={iconColor} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-base">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <svg className="text-slate-300 group-hover:text-slate-500 transition shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          © 2026 EduConnect AI · Designed for modern educational institutions
        </p>
      </div>
    </div>
  );
}
