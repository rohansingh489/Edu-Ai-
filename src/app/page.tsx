import Link from "next/link";
import {
  Bot,
  FileText,
  GraduationCap,
  Users,
  ShieldCheck,
  CalendarCheck,
  ClipboardList,
  MessageSquare,
  LifeBuoy,
  BarChart3,
  BookOpen,
  School,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { PublicPage } from "@/components/site";
import { ContactForm } from "@/components/contact-form";
import { Flash, type SP } from "@/components/ui";

const roleCards = [
  {
    title: "For Students",
    icon: GraduationCap,
    items: ["Attendance, results & performance in one place", "Assignments with deadlines and submissions", "Study materials, notes & question papers", "Message teachers, track complaints"],
  },
  {
    title: "For Teachers",
    icon: Users,
    items: ["Mark attendance in a few clicks", "Create assignments & grade submissions", "Upload notes, PDFs and video links", "Enter marks, reply to student queries"],
  },
  {
    title: "For Administrators",
    icon: ShieldCheck,
    items: ["Manage students, teachers, classes, subjects", "Attendance, exam and fee reports", "Resolve complaints, publish announcements", "Analytics for schools and colleges"],
  },
];

const benefits = [
  { icon: School, t: "Schools & colleges", d: "Classes and sections for schools, programs and semesters for colleges." },
  { icon: ShieldCheck, t: "Secure by design", d: "Hashed passwords, server-side role checks, institution-level data isolation." },
  { icon: BarChart3, t: "Actionable insight", d: "Attendance warnings, performance charts and exportable reports." },
  { icon: MessageSquare, t: "Connected community", d: "Messaging, announcements and notifications keep everyone aligned." },
];

export default async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  return (
    <PublicPage>
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-600 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="animate-fadeUp">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <Sparkles size={14} /> AI-powered education platform
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">One Platform.<br />Every Student.<br />Every Solution.</h1>
            <p className="mt-5 max-w-xl text-lg text-navy-100">
              EduConnect AI brings academics, communication and an AI study assistant together so students never juggle multiple websites again.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login/student" className="btn bg-white px-6 py-3 text-navy-900 hover:bg-navy-50">Student login</Link>
              <Link href="/login/teacher" className="btn border border-white/40 px-6 py-3 text-white hover:bg-white/10">Teacher login</Link>
              <Link href="/login/admin" className="btn border border-white/40 px-6 py-3 text-white hover:bg-white/10">Admin login</Link>
            </div>
          </div>
          <div className="rounded-3xl bg-white/10 p-5 backdrop-blur animate-fadeUp">
            <div className="rounded-2xl bg-white p-4 text-slate-800 shadow-xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <Bot className="text-blue-600" size={18} /> EduBot
              </div>
              <div className="mt-3 space-y-3 text-sm">
                <p className="ml-auto w-fit rounded-2xl bg-navy-800 px-3 py-2 text-white">Explain database normalization simply</p>
                <p className="w-fit max-w-[90%] rounded-2xl bg-slate-100 px-3 py-2">
                  Normalization organises data into tables so each fact is stored once. <b>1NF</b>: atomic values. <b>2NF</b>: no partial dependencies. <b>3NF</b>: no transitive dependencies…
                </p>
                <div className="flex gap-2">
                  <span className="rounded-full border border-blue-200 px-3 py-1 text-xs text-blue-700">Show an example</span>
                  <span className="rounded-full border border-blue-200 px-3 py-1 text-xs text-blue-700">Generate 5 MCQs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-navy-900">Everything an institution needs, in one place</h2>
          <p className="mt-3 text-slate-600">From daily attendance to exam results, from teacher queries to complaint resolution — plus AI that helps students actually learn.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [CalendarCheck, "Attendance"],
            [ClipboardList, "Assignments"],
            [BookOpen, "Study materials"],
            [LifeBuoy, "Complaints"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof CalendarCheck;
            return (
              <div key={label as string} className="card text-center transition hover:-translate-y-1 hover:shadow-md">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-navy-50 text-navy-700">
                  <I />
                </span>
                <p className="mt-3 font-semibold text-navy-900">{label as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Role features */}
      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3">
          {roleCards.map((c) => (
            <div key={c.title} className="card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white">
                <c.icon size={22} />
              </span>
              <h3 className="mt-4 text-lg font-bold text-navy-900">{c.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {c.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* AI showcases */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-navy-900 p-8 text-white">
          <Bot size={32} className="text-blue-400" />
          <h3 className="mt-4 text-2xl font-bold">EduBot – your AI study assistant</h3>
          <p className="mt-2 text-navy-100">Step-by-step maths and science, programming help, notes, summaries, MCQs and exam preparation in English and Hindi. Conversations are saved so you can pick up where you left off.</p>
          <ul className="mt-4 grid gap-2 text-sm text-navy-100 sm:grid-cols-2">
            {["Homework guidance", "Practice questions", "Concept explanations", "Suggested follow-ups"].map((x) => (
              <li key={x} className="flex gap-2"><CheckCircle2 size={16} className="text-blue-400" />{x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-navy-700 p-8 text-white">
          <FileText size={32} />
          <h3 className="mt-4 text-2xl font-bold">Chat with Your PDF</h3>
          <p className="mt-2 text-blue-50">Upload a study PDF and ask questions directly. EduBot finds the relevant pages, answers from your document and shows page references — no more reading 200 pages the night before.</p>
          <ul className="mt-4 grid gap-2 text-sm text-blue-50 sm:grid-cols-2">
            {["Summaries & key topics", "Generate MCQs", "Explain any page", "Private to your account"].map((x) => (
              <li key={x} className="flex gap-2"><CheckCircle2 size={16} />{x}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-navy-900">Why EduConnect AI</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div key={b.t} className="rounded-2xl border border-slate-200 p-5">
                <b.icon className="text-blue-600" />
                <p className="mt-3 font-bold text-navy-900">{b.t}</p>
                <p className="mt-1 text-sm text-slate-600">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-navy-900">Get in touch</h2>
          <p className="mt-2 text-slate-600">Want a demo for your school or college? Send us a message.</p>
        </div>
        <div className="card mt-8">
          <Flash sp={sp} />
          <ContactForm redirectTo="/#contact" />
        </div>
      </section>
    </PublicPage>
  );
}
