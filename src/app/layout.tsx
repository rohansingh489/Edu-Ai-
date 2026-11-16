import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduConnect AI – One Platform. Every Student. Every Solution.",
  description:
    "AI-powered school and college management platform: attendance, assignments, results, messaging, complaints, an AI study chatbot and Chat with Your PDF.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
