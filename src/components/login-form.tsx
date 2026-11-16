"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, Sparkles } from "lucide-react";

const DEMO_PRESETS: Record<"student" | "teacher" | "admin", Array<{ label: string; id: string }>> = {
  student: [
    { label: "STU2026001", id: "STU2026001" },
  ],
  teacher: [
    { label: "EMP1001", id: "EMP1001" },
    { label: "EMP1002", id: "EMP1002" },
  ],
  admin: [
    { label: "SUPER001", id: "SUPER001" },
    { label: "ADMIN001 (Rohan Singh)", id: "ADMIN001" },
    { label: "ADMIN002", id: "ADMIN002" },
  ],
};

export function LoginForm({ portal, idLabel }: { portal: "student" | "teacher" | "admin"; idLabel: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function fillDemo(id: string) {
    setIdentifier(id);
    setPassword("Password@123");
    setError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal, identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed. Please check your credentials.");
        return;
      }
      router.push(data.redirect);
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const presets = DEMO_PRESETS[portal];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-950/60 px-4 py-3 text-sm text-red-200 shadow-sm animate-fadeUp">
          {error}
        </div>
      )}

      {/* Identifier */}
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-200">
          {idLabel}
        </span>
        <input
          className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-white placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-slate-950 focus:ring-2 focus:ring-blue-500/25 shadow-inner"
          style={{ color: "#ffffff", backgroundColor: "#0f172a" }}
          autoComplete="username"
          required
          placeholder={`Enter your ${idLabel.toLowerCase()}`}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </label>

      {/* Password */}
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-200">
          Password
        </span>
        <div className="relative">
          <input
            className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3.5 py-2.5 pr-11 text-sm font-medium text-white placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-slate-950 focus:ring-2 focus:ring-blue-500/25 shadow-inner"
            style={{ color: "#ffffff", backgroundColor: "#0f172a" }}
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            aria-label="Toggle password visibility"
            onClick={() => setShow(!show)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-600/30"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? "Signing in…" : "Sign in"}
      </button>

      {/* Demo presets */}
      {presets && presets.length > 0 && (
        <div className="border-t border-slate-700/70 pt-4 mt-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2.5">
            <Sparkles size={12} className="text-amber-400" />
            <span className="font-medium">Quick demo logins (click to autofill):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => fillDemo(p.id)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-700 text-slate-200 hover:text-white font-medium transition border border-slate-600 shadow-sm"
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Password for all: <code className="font-mono text-slate-300">Password@123</code></p>
        </div>
      )}
    </form>
  );
}
