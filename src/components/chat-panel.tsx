"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Plus, Send, Trash2, User, AlertTriangle } from "lucide-react";
import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";

type Msg = { id?: string; role: "USER" | "ASSISTANT"; content: string; followUps?: string[] };
type Convo = { id: string; title: string };

const STARTERS = [
  "Explain Newton's laws in simple language",
  "Solve step by step: 2x + 5 = 17",
  "Generate 5 MCQs on photosynthesis",
  "Mujhe binary search Hindi mein samjhao",
];

export function ChatPanel({ compact = false }: { compact?: boolean }) {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const r = await fetch("/api/ai/chat");
    if (r.ok) {
      const d = await r.json();
      setConvos(d.conversations);
      setConfigured(d.configured);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function open(id: string) {
    setActiveId(id);
    setError("");
    const r = await fetch(`/api/ai/chat?conversationId=${id}`);
    if (r.ok) {
      const d = await r.json();
      setMessages(
        d.messages.map((m: { id: string; role: "USER" | "ASSISTANT"; content: string; meta?: { followUps?: string[] } }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          followUps: m.meta?.followUps,
        }))
      );
    }
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setError("");
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;
    setInput("");
    setError("");
    setMessages((m) => [...m, { role: "USER", content: message }]);
    setLoading(true);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId ?? undefined, message }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Something went wrong");
        if (d.code === "AI_NOT_CONFIGURED") setConfigured(false);
        setMessages((m) => m.slice(0, -1));
        setInput(message);
        return;
      }
      setActiveId(d.conversationId);
      setMessages((m) => [...m, { role: "ASSISTANT", content: d.answer, followUps: d.followUps }]);
      loadList();
    } catch {
      setError("Network error. Please try again.");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    if (activeId) await fetch(`/api/ai/chat?conversationId=${activeId}`, { method: "DELETE" });
    newChat();
    loadList();
  }

  return (
    <div className={cn("flex overflow-hidden rounded-2xl border border-slate-200 bg-white", compact ? "h-full flex-col" : "h-[calc(100vh-11rem)] min-h-[480px]")}>
      {!compact && (
        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50 sm:flex">
          <button onClick={newChat} className="m-3 btn-primary btn-sm">
            <Plus size={14} /> New chat
          </button>
          <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
            {convos.length === 0 && <p className="px-2 text-xs text-slate-400">No saved conversations yet.</p>}
            {convos.map((c) => (
              <button
                key={c.id}
                onClick={() => open(c.id)}
                className={cn("block w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-white", activeId === c.id && "bg-white font-semibold shadow-sm")}
              >
                {c.title}
              </button>
            ))}
          </div>
        </aside>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <Bot size={18} className="text-blue-600" /> EduBot
          </div>
          <div className="flex gap-2">
            {compact && (
              <button onClick={newChat} className="btn-outline btn-sm">
                <Plus size={12} /> New
              </button>
            )}
            <button onClick={clearChat} disabled={!messages.length} className="btn-outline btn-sm">
              <Trash2 size={12} /> Clear
            </button>
          </div>
        </div>

        {!configured && (
          <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            AI is not configured on this server. An administrator must set GEMINI_API_KEY in the server environment.
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                <Bot />
              </div>
              <h3 className="mt-3 font-bold text-navy-900">Ask me anything about your studies</h3>
              <p className="mt-1 text-sm text-slate-500">Maths, science, coding, history, notes, MCQs, exam prep — in English or Hindi.</p>
              <div className="mt-4 grid gap-2">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-300 hover:bg-blue-50">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2", m.role === "USER" && "flex-row-reverse")}>
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", m.role === "USER" ? "bg-navy-800 text-white" : "bg-blue-100 text-blue-700")}>
                {m.role === "USER" ? <User size={15} /> : <Bot size={15} />}
              </span>
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5", m.role === "USER" ? "bg-navy-800 text-sm text-white" : "bg-slate-100")}>
                {m.role === "USER" ? m.content : <Markdown>{m.content}</Markdown>}
                {m.role === "ASSISTANT" && !!m.followUps?.length && i === messages.length - 1 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.followUps.map((f) => (
                      <button key={f} onClick={() => send(f)} className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs text-blue-700 hover:bg-blue-50">
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> EduBot is thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && <div className="mx-4 mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 border-t border-slate-200 p-3"
        >
          <input className="input" placeholder="Type your question…" value={input} onChange={(e) => setInput(e.target.value)} maxLength={4000} />
          <button disabled={loading || !input.trim()} className="btn-accent" aria-label="Send">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
