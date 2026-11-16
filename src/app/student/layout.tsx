import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell, type NavItem } from "@/components/shell";
import { FloatingBot } from "@/components/floating-bot";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireStudent();
  const [unread, unreadMsgs] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.message.count({ where: { readAt: null, senderId: { not: user.id }, conversation: { studentId: user.id } } }),
  ]);
  const nav: NavItem[] = [
    { href: "/student/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/student/profile", label: "Profile", icon: "User" },
    { href: "/student/attendance", label: "Attendance", icon: "CalendarCheck" },
    { href: "/student/assignments", label: "Assignments", icon: "ClipboardList" },
    { href: "/student/results", label: "Results", icon: "GraduationCap" },
    { href: "/student/materials", label: "Study Materials", icon: "BookOpen" },
    { href: "/student/chatbot", label: "EduBot AI", icon: "Bot" },
    { href: "/student/pdf", label: "Chat with Your PDF", icon: "FileText" },
    { href: "/student/messages", label: "Messages", icon: "MessageSquare", badge: unreadMsgs },
    { href: "/student/complaints", label: "Complaints", icon: "LifeBuoy" },
    { href: "/student/notifications", label: "Notifications", icon: "Bell", badge: unread },
    { href: "/student/settings", label: "Settings", icon: "Settings" },
  ];
  return (
    <Shell nav={nav} roleLabel="Student" userName={user.name} institution={profile.institution.name} extra={<FloatingBot />}>
      {children}
    </Shell>
  );
}
