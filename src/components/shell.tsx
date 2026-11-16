"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, User, CalendarCheck, ClipboardList, GraduationCap,
  BookOpen, Bot, FileText, MessageSquare, LifeBuoy, Bell, Settings,
  Users, School, Building2, Layers, BarChart3, Megaphone, FileSpreadsheet,
  HelpCircle, Menu, X, LogOut, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  LayoutDashboard, User, CalendarCheck, ClipboardList, GraduationCap,
  BookOpen, Bot, FileText, MessageSquare, LifeBuoy, Bell, Settings,
  Users, School, Building2, Layers, BarChart3, Megaphone, FileSpreadsheet,
  HelpCircle,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = [
    "from-blue-500 to-blue-700", "from-violet-500 to-violet-700",
    "from-emerald-500 to-emerald-700", "from-amber-500 to-amber-700",
    "from-rose-500 to-rose-700", "from-cyan-500 to-cyan-700",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${color} text-xs font-bold text-white shadow-sm`}>
      {initials}
    </span>
  );
}

export function Shell({
  nav, roleLabel, userName, institution, children, extra,
}: {
  nav: NavItem[];
  roleLabel: string;
  userName: string;
  institution: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const sidebar = (
    <div className="flex h-full flex-col" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e2d4e 50%, #0f172a 100%)" }}>
      {/* Logo header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 font-extrabold text-white shadow-lg shadow-blue-900/40">
          E
        </span>
        <div className="min-w-0">
          <p className="font-bold text-white leading-tight">EduConnect AI</p>
          <p className="text-[10px] text-blue-300 uppercase tracking-widest">{roleLabel}</p>
        </div>
      </div>

      {/* Institution pill */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-white/8 px-3 py-2">
          <Building2 size={13} className="text-blue-300 shrink-0" />
          <span className="truncate text-xs text-slate-300 font-medium">{institution}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
        {nav.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={17} className={active ? "text-white" : "text-slate-400 group-hover:text-white transition-colors"} />
              <span className="flex-1 truncate">{item.label}</span>
              {!!item.badge && (
                <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
              {active && <ChevronRight size={14} className="text-white/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar name={userName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="truncate text-xs text-slate-400">{roleLabel}</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-red-600/80 hover:text-white transition-all duration-150">
            <LogOut size={14} /> Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 shadow-xl md:block z-20">{sidebar}</aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-3 text-white shadow-md md:hidden">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600 text-xs font-bold">E</span>
          <span className="font-bold text-sm">EduConnect AI</span>
        </div>
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-white/10 transition">
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 shadow-2xl animate-slideRight">
            <button aria-label="Close menu" className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-white hover:bg-white/10" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="md:pl-64 min-h-screen flex flex-col">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 sm:px-8 backdrop-blur-md sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-3 py-1 text-xs font-semibold text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              {institution}
            </span>
            <span className="text-xs text-slate-400 font-medium">·</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {roleLabel} Portal
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Live Email/SMS Gateway Status indicator */}
            <div className="hidden lg:flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Email & SMS Active</span>
            </div>

            {/* Notification quick link */}
            <Link
              href={
                roleLabel === "Student"
                  ? "/student/notifications"
                  : roleLabel === "Teacher" || roleLabel === "Faculty"
                  ? "/teacher/notifications"
                  : "/admin/notifications"
              }
              className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              title="Notifications"
            >
              <Bell size={18} />
              {nav.find((i) => i.icon === "Bell")?.badge ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-xs">
                  {nav.find((i) => i.icon === "Bell")?.badge}
                </span>
              ) : null}
            </Link>

            {/* User pill */}
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
              <Avatar name={userName} />
              <div className="text-left text-xs leading-tight">
                <p className="font-bold text-slate-900">{userName}</p>
                <p className="text-[10px] text-slate-400">{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8 animate-fadeIn">
          {children}
        </div>
      </main>
      {extra}
    </div>
  );
}
