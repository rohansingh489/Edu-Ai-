import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell, type NavItem } from "@/components/shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, institution, isSuper } = await requireAdmin();
  const [unread, pending] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.complaint.count({ where: { institutionId: institution.id, status: "PENDING" } }),
  ]);

  const isCollege = institution.type === "COLLEGE";

  const nav: NavItem[] = [
    { href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/admin/students", label: "Students", icon: "GraduationCap" },
    { href: "/admin/teachers", label: "Faculty", icon: "Users" },
    { href: "/admin/classes", label: isCollege ? "Batches & Sections" : "Classes", icon: "School" },
    { href: "/admin/departments", label: isCollege ? "Depts & Programs" : "Departments", icon: "Layers" },
    { href: "/admin/subjects", label: "Subjects", icon: "BookOpen" },
    { href: "/admin/attendance", label: "Attendance", icon: "CalendarCheck" },
    { href: "/admin/examinations", label: "Examinations", icon: "FileSpreadsheet" },
    { href: "/admin/complaints", label: "Complaints", icon: "LifeBuoy", badge: pending },
    { href: "/admin/announcements", label: "Announcements", icon: "Megaphone" },
    { href: "/admin/analytics", label: "Analytics", icon: "BarChart3" },
    { href: "/admin/notifications", label: "Notifications", icon: "Bell", badge: unread },
    ...(isSuper
      ? [{ href: "/admin/institutions", label: "Institutions", icon: "Building2" as const }]
      : [{ href: "/admin/settings", label: "Settings", icon: "Settings" as const }]
    ),
  ];

  return (
    <Shell
      nav={nav}
      roleLabel={isSuper ? "Super Admin" : "Administrator"}
      userName={user.name}
      institution={institution.name}
    >
      {children}
    </Shell>
  );
}
