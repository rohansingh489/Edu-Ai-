import { PublicPage } from "@/components/site";

export default function About() {
  return (
    <PublicPage>
      <section className="bg-navy-900 py-16 text-center text-white">
        <h1 className="text-4xl font-extrabold">About EduConnect AI</h1>
        <p className="mx-auto mt-3 max-w-2xl px-4 text-navy-100">One Platform. Every Student. Every Solution.</p>
      </section>
      <section className="mx-auto max-w-3xl space-y-5 px-4 py-14 text-slate-700 sm:px-6">
        <p>
          Students today switch between attendance portals, messaging apps, file-sharing sites, complaint forms and AI tools just to manage a normal school week.
          EduConnect AI replaces that patchwork with a single, secure platform for schools and colleges.
        </p>
        <p>
          Teachers manage classes, attendance, assignments and marks. Administrators run the institution — students, teachers, classes, exams, fees, complaints and announcements.
          Students see everything that matters to them in one dashboard and can ask EduBot, our AI study assistant, for help in English or Hindi.
        </p>
        <p>
          Our <b>Chat with Your PDF</b> feature lets students upload their own study material and ask questions directly from it, with answers that point to the exact pages.
        </p>
        <h2 className="pt-4 text-2xl font-bold text-navy-900">Our principles</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li><b>Privacy first:</b> each institution&apos;s data is isolated, and students&apos; uploaded PDFs are visible only to them.</li>
          <li><b>Honest AI:</b> answers come from real model calls and your documents — never canned replies.</li>
          <li><b>Simple to run:</b> one web app, one database, no unnecessary moving parts.</li>
        </ul>
      </section>
    </PublicPage>
  );
}
