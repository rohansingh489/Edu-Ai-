import { requireStudent } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PdfChat } from "@/components/pdf-chat";

export default async function PdfPage() {
  await requireStudent();
  return (
    <>
      <PageHeader title="Chat with Your PDF" subtitle="Upload a study PDF and ask questions. Answers come from your document, with page references." />
      <PdfChat />
    </>
  );
}
