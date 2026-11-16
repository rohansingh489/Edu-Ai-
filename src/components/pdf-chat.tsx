"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, FileText, Loader2, Send, Trash2, Upload, User } from "lucide-react";
import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";

type Doc = {
  id: string;
  title: string;
  fileName: string;
  pageCount: number;
  sizeBytes: number;
  status: "PROCESSING" | "READY" | "FAILED";
  error: string | null;
  hasEmbeddings: boolean;
};
type Source = { page: number; snippet: string };
type Msg = { role: "USER" | "ASSISTANT"; content: string; followUps?: string[]; sources?: Source[] };

const SUGGESTIONS = [
  "Summarize the entire PDF",
  "What are the important topics in this document?",
  "Generate 20 MCQs from this PDF",
  "Create examination notes from this document",
  "Explain page 1 in simple language",
];

export function PdfChat() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadDocs = useCallback(async () => {
    const r = await fetch("/api/pdf");
    if (r.ok) {
      const d = await r.json();
      setDocs(d.documents);
      setAiConfigured(d.aiConfigured);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  async function select(id: string) {
    setActiveId(id);
    setError("");
    setMessages([]);
    const r = await fetch(`/api/pdf/chat?documentId=${id}`);
    if (r.ok) {
      const d = await r.json();
      setMessages(
        d.messages.map((m: { role: "USER" | "ASSISTANT"; content: string; meta?: { followUps?: string[]; sources?: Source[] } }) => ({
          role: m.role,
          content: m.content,
          followUps: m.meta?.followUps,
          sources: m.meta?.sources,
        }))
      );
    }
  }

  async function upload(file: File) {
    setError("");
    setInfo("");
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a .pdf file.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/pdf", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Upload failed");
        return;
      }
      if (d.note) setInfo(d.note);
      await loadDocs();
      select(d.id);
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this PDF and its chat history?")) return;
    await fetch(`/api/pdf?id=${id}`, { method: "DELETE" });
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    loadDocs();
  }

  async function clearChat() {
    if (!activeId) return;
    await fetch(`/api/pdf/chat?documentId=${activeId}`, { method: "DELETE" });
    setMessages([]);
  }

  async function ask(text: string) {
    const message = text.trim();
    if (!message || !activeId || asking) return;
    setInput("");
    setError("");
    setMessages((m) => [...m, { role: "USER", content: message }]);
    setAsking(true);
    try {
      const r = await fetch("/api/pdf/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: activeId, message }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Something went wrong");
        if (d.code === "AI_NOT_CONFIGURED") setAiConfigured(false);
        setMessages((m) => m.slice(0, -1));
        setInput(message);
        return;
      }
      setMessages((m) => [...m, { role: "ASSISTANT", content: d.answer, followUps: d.followUps, sources: d.sources }]);
    } catch {
      setError("Network error. Please try again.");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setAsking(false);
    }
  }

  const active = docs.find((d) => d.id === activeId);

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white md:flex-row">
      {/* Left: documents */}
      <aside className="flex max-h-56 w-full shrink-0 flex-col border-b border-slate-200 bg-slate-50 md:max-h-none md:w-72 md:border-b-0 md:border-r">
        <div className="p-3">
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary w-full">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Reading PDF…" : "Upload PDF"}
          </button>
          <p className="mt-2 text-[11px] text-slate-500">Private to you. Text PDFs only (scanned PDFs need OCR).</p>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {docs.length === 0 && <p className="px-2 text-xs text-slate-400">No PDFs yet. Upload one to start.</p>}
          {docs.map((d) => (
            <div
              key={d.id}
              className={cn("group flex items-start gap-2 rounded-xl p-2 text-sm", activeId === d.id ? "bg-white shadow-sm" : "hover:bg-white")}
            >
              <button className="flex min-w-0 flex-1 items-start gap-2 text-left" onClick={() => d.status === "READY" && select(d.id)}>
                <FileText size={16} className="mt-0.5 shrink-0 text-blue-600" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{d.fileName}</span>
                  <span className="block text-[11px] text-slate-500">
                    {d.pageCount} pages · {(d.sizeBytes / 1024 / 1024).toFixed(1)} MB ·{" "}
                    <span className={d.status === "READY" ? "text-emerald-600" : d.status === "FAILED" ? "text-red-600" : "text-blue-600"}>
                      {d.status === "READY" ? "Ready" : d.status === "FAILED" ? "Failed" : "Processing"}
                    </span>
                  </span>
                </span>
              </button>
              <button onClick={() => remove(d.id)} aria-label="Remove PDF" className="text-slate-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main: chat */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <div className="min-w-0 truncate text-sm font-semibold text-navy-900">{active ? active.fileName : "Chat with Your PDF"}</div>
          {active && (
            <button onClick={clearChat} disabled={!messages.length} className="btn-outline btn-sm">
              <Trash2 size={12} /> Clear chat
            </button>
          )}
        </div>

        {!aiConfigured && (
          <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            AI is not configured on this server (GEMINI_API_KEY missing). You can upload PDFs, but questions cannot be answered until an administrator sets it.
          </div>
        )}
        {info && <div className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-800">{info}</div>}

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!active && (
            <div className="mx-auto max-w-sm pt-10 text-center text-slate-500">
              <FileText className="mx-auto text-blue-500" size={36} />
              <h3 className="mt-3 font-bold text-navy-900">Upload a PDF and ask it questions</h3>
              <p className="mt-1 text-sm">Pick or upload a document on the left. Answers come from your document, with page references.</p>
            </div>
          )}
          {active && messages.length === 0 && (
            <div className="mx-auto max-w-md space-y-2 pt-6 text-center">
              <p className="text-sm text-slate-500">Try one of these:</p>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-300 hover:bg-blue-50">
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2", m.role === "USER" && "flex-row-reverse")}>
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", m.role === "USER" ? "bg-navy-800 text-white" : "bg-blue-100 text-blue-700")}>
                {m.role === "USER" ? <User size={15} /> : <Bot size={15} />}
              </span>
              <div className={cn("max-w-[88%] rounded-2xl px-4 py-2.5", m.role === "USER" ? "bg-navy-800 text-sm text-white" : "bg-slate-100")}>
                {m.role === "USER" ? m.content : <Markdown>{m.content}</Markdown>}
                {m.role === "ASSISTANT" && !!m.sources?.length && (
                  <div className="mt-3 border-t border-slate-200 pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sources</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {m.sources.map((s) => (
                        <span key={s.page} title={s.snippet} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-navy-700 ring-1 ring-slate-200">
                          Page {s.page}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {m.role === "ASSISTANT" && !!m.followUps?.length && i === messages.length - 1 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.followUps.map((f) => (
                      <button key={f} onClick={() => ask(f)} className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs text-blue-700 hover:bg-blue-50">
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {asking && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Searching your document…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && <div className="mx-4 mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex gap-2 border-t border-slate-200 p-3"
        >
          <input
            className="input"
            disabled={!active}
            placeholder={active ? "Ask a question about this PDF…" : "Select a PDF first"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={4000}
          />
          <button disabled={!active || asking || !input.trim()} className="btn-accent" aria-label="Send">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
