"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, X, Maximize2 } from "lucide-react";
import { ChatPanel } from "./chat-panel";

/** Floating assistant button + mini chat available on every student page. */
export function FloatingBot() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-3">
      {open && (
        <div className="h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl shadow-2xl animate-fadeUp">
          <div className="flex items-center justify-between bg-navy-900 px-3 py-1.5 text-xs text-white">
            <span>Quick chat</span>
            <span className="flex items-center gap-3">
              <Link href="/student/chatbot" aria-label="Open full page" title="Open full page">
                <Maximize2 size={13} />
              </Link>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X size={14} />
              </button>
            </span>
          </div>
          <div className="h-[calc(100%-1.9rem)]">
            <ChatPanel compact />
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Open EduBot assistant"
        className="grid h-14 w-14 place-items-center rounded-full bg-blue-600 text-white shadow-lg transition hover:scale-105 hover:bg-blue-500"
      >
        {open ? <X /> : <Bot />}
      </button>
    </div>
  );
}
