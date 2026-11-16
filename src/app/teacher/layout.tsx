import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell, type NavItem } from "@/components/shell";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireTeacher();
  const [unread, unreadMsgs] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.message.count({ where: { readAt: null, senderId: { not: user.id }, conversation: { teacherId: user.id } } }),
  ]);
  const nav: NavItem[] = [
    { href: "/teacher/dashboard",   label: "Dashboard",        icon: "LayoutDashboard" },
    { href: "/teacher/students",    label: "My Students",      icon: "Users" },
    { href: "/teacher/classes",     label: "Classes",          icon: "School" },
    { href: "/teacher/subjects",    label: "Subjects",         icon: "Layers" },
    { href: "/teacher/attendance",  label: "Attendance",       icon: "CalendarCheck" },
    { href: "/teacher/assignments", label: "Assignments",      icon: "ClipboardList" },
    { href: "/teacher/materials",   label: "Study Materials",  icon: "BookOpen" },
    { href: "/teacher/results",     label: "Results",          icon: "FileSpreadsheet" },
    { href: "/teacher/queries",     label: "Student Queries",  icon: "HelpCircle", badge: unreadMsgs },
    { href: "/teacher/messages",    label: "Messages",         icon: "MessageSquare" },
    { href: "/teacher/notifications", label: "Notifications",  icon: "Bell", badge: unread },
    { href: "/teacher/settings",    label: "Settings",         icon: "Settings" },
  ];
  return (
    <Shell nav={nav} roleLabel="Faculty" userName={user.name} institution={profile.institution.name}>
      {children}
    </Shell>
  );
}
