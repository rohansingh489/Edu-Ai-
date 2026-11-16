import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-900/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600">
            <GraduationCap size={20} />
          </span>
          EduConnect AI
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-navy-100 md:flex">
          <Link href="/features" className="hover:text-white">Features</Link>
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login/student" className="btn bg-white text-navy-900 hover:bg-navy-50 btn-sm">Student</Link>
          <Link href="/login/teacher" className="btn border border-white/30 text-white hover:bg-white/10 btn-sm">Teacher</Link>
          <Link href="/login/admin" className="hidden btn border border-white/30 text-white hover:bg-white/10 btn-sm sm:inline-flex">Admin</Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-navy-900 text-navy-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="flex items-center gap-2 text-lg font-bold text-white">
            <GraduationCap /> EduConnect AI
          </p>
          <p className="mt-3 max-w-sm text-sm">One Platform. Every Student. Every Solution. Attendance, assignments, results, messaging, complaints and an AI study assistant for schools and colleges.</p>
        </div>
        <div>
          <p className="mb-3 font-semibold text-white">Platform</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/features" className="hover:text-white">Features</Link></li>
            <li><Link href="/about" className="hover:text-white">About us</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold text-white">Portals</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/login/student" className="hover:text-white">Student login</Link></li>
            <li><Link href="/login/teacher" className="hover:text-white">Teacher login</Link></li>
            <li><Link href="/login/admin" className="hover:text-white">Administrator login</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} EduConnect AI. All rights reserved.</div>
    </footer>
  );
}

export function PublicPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
