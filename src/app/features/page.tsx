import { PublicPage } from "@/components/site";
import { CheckCircle2 } from "lucide-react";

const groups = [
  {
    t: "Students",
    items: ["Dashboard with attendance, results, assignments and messages", "Subject-wise & monthly attendance", "Assignment submission with files", "Study materials, notes, question papers & video lectures", "Message teachers with attachments", "Complaint portal with ticket tracking", "In-app notifications", "EduBot AI chatbot & Chat with Your PDF"],
  },
  {
    t: "Teachers",
    items: ["Assigned classes and subjects", "Attendance marking with low-attendance alerts", "Create assignments, grade submissions", "Upload notes, PDFs and presentations", "Enter exam marks with automatic grades", "Reply to student queries", "Publish announcements", "Monitor student performance"],
  },
  {
    t: "Administrators",
    items: ["Add, edit, view and deactivate students & teachers", "Classes, subjects, departments, academic years", "Attendance & examination reports", "Fee records", "Complaint management with responses", "Announcements to everyone or specific classes", "Analytics dashboards", "Super Admin: manage multiple institutions"],
  },
  {
    t: "AI & Security",
    items: ["Server-side OpenAI calls – keys never reach the browser", "Retrieval-Augmented Generation over your PDFs", "Page-level source references", "Hashed passwords & signed sessions", "Role checks on every request, on the server", "Institution-level data isolation", "Upload validation & size limits", "Audit log of key actions"],
  },
];

export default function Features() {
  return (
    <PublicPage>
      <section className="bg-navy-900 py-14 text-center text-white">
        <h1 className="text-4xl font-extrabold">Features</h1>
        <p className="mt-2 text-navy-100">Everything in one platform</p>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.t} className="card">
            <h2 className="text-xl font-bold text-navy-900">{g.t}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {g.items.map((i) => (
                <li key={i} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </PublicPage>
  );
}
