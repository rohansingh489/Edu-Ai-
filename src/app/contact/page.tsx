import { PublicPage } from "@/components/site";
import { ContactForm } from "@/components/contact-form";
import { Flash, type SP } from "@/components/ui";

export default async function Contact({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  return (
    <PublicPage>
      <section className="bg-navy-900 py-14 text-center text-white">
        <h1 className="text-4xl font-extrabold">Contact us</h1>
        <p className="mt-2 text-navy-100">We usually reply within one working day.</p>
      </section>
      <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <div className="card">
          <Flash sp={sp} />
          <ContactForm redirectTo="/contact" />
        </div>
      </section>
    </PublicPage>
  );
}
