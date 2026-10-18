"use client";

import { LoaderCircle, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed.");
      router.push("/");
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Login failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="studio-canvas flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-[28px] border border-white/75 bg-white/70 p-8 shadow-[0_24px_80px_rgba(22,37,34,.12)] backdrop-blur-2xl entrance">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ink)] text-base font-bold text-[var(--lime)]">
            C
          </div>
          <div>
            <p className="text-base font-extrabold tracking-tight">clubhouse</p>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">
              media desk
            </p>
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-[-.05em]">Welcome back.</h1>
        <p className="mb-6 mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Log in to access your media workspace.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-xs font-extrabold"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. media.lead"
              className="w-full rounded-xl border border-[var(--line)] bg-[#fafbf7] px-3.5 py-2.5 text-sm outline-none transition placeholder:text-[#a8b0a7] focus:border-[var(--ink)] focus:ring-2 focus:ring-[var(--lime)]"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-extrabold"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[var(--line)] bg-[#fafbf7] px-3.5 py-2.5 text-sm outline-none transition placeholder:text-[#a8b0a7] focus:border-[var(--ink)] focus:ring-2 focus:ring-[var(--lime)]"
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-[#fff0ec] px-3 py-2 text-xs font-bold text-[#b8543c]"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#263b35] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Lock size={15} />
            )}
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[.15em] text-[#a4afa5]">
          Spring / 2026
        </p>
      </div>
    </main>
  );
}
