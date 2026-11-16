import { requireStudent } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ChatPanel } from "@/components/chat-panel";

export default async function ChatbotPage() {
  await requireStudent();
  return (
    <>
      <PageHeader title="EduBot AI" subtitle="Your study assistant — maths, science, coding, history, notes, MCQs and exam prep. English and Hindi." />
      <ChatPanel />
    </>
  );
}
