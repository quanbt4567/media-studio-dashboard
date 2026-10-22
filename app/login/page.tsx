"use client";

import { Eye, EyeOff, LoaderCircle, Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ClubLogo from "../components/club-logo";
import ParticleField from "../components/fx/particle-field";
import ThemeToggle from "../components/theme-toggle";

/**
 * Login — futuristic dark glass card over an ambient particle field and
 * two slow-drifting accent orbs (violet/cyan) with gentle mouse parallax.
 * Auth flow is unchanged: POST /api/auth/login, then router push + refresh.
 * Motion honors prefers-reduced-motion and only follows fine pointers.
 */
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const orbsRef = useRef<HTMLDivElement>(null);

  // Cursor parallax for the ambient orbs — transform-only, ref-driven
  // (no React state per frame), disabled for touch / reduced motion.
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    let raf = 0;
    const onMove = (event: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = orbsRef.current;
        if (!el) return;
        const x = (event.clientX / window.innerWidth - 0.5) * 18;
        const y = (event.clientY / window.innerHeight - 0.5) * 14;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

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
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] py-2.5 pl-10 pr-3.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(167,139,250,.35)]";

  return (
    <main className="studio-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Ambient layer: drifting accent orbs (parallax) + particle field. */}
      <div ref={orbsRef} aria-hidden="true" className="pointer-events-none absolute inset-0 will-change-transform">
        <div className="orb-drift-a absolute -left-32 top-[-15%] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,.22),transparent_65%)] blur-3xl" />
        <div className="orb-drift-b absolute -right-32 bottom-[-20%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,.14),transparent_65%)] blur-3xl" />
      </div>
      <ParticleField />
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="entrance relative z-10 w-full max-w-sm overflow-hidden rounded-[20px] border border-[var(--glass-border)] bg-[var(--glass)] p-8 shadow-[var(--card-shadow)] backdrop-blur-2xl">
        <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(167,139,250,.7)] to-transparent" />
        <div className="stagger-item mb-8" style={{ animationDelay: "60ms" }}>
          <ClubLogo size="lg" />
        </div>
        <div className="stagger-item" style={{ animationDelay: "130ms" }}>
          <p className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.2em] text-[var(--accent-2)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-2)] shadow-[0_0_10px_rgba(34,211,238,.9)]" />
            AI Media Desk
          </p>
          <h1 className="text-2xl font-black tracking-[-.05em]">Welcome back.</h1>
          <p className="mb-6 mt-1 text-xs leading-relaxed text-[var(--muted)]">Log in to access your media workspace.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
          <div className="stagger-item" style={{ animationDelay: "200ms" }}>
            <label htmlFor="username" className="mb-1.5 block text-xs font-extrabold">Username</label>
            <div className="relative">
              <User size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
              <input
                id="username"
                suppressHydrationWarning
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. media.lead"
                disabled={loading}
                className={inputClass}
              />
            </div>
          </div>
          <div className="stagger-item" style={{ animationDelay: "270ms" }}>
            <label htmlFor="password" className="mb-1.5 block text-xs font-extrabold">Password</label>
            <div className="relative">
              <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
              <input
                id="password"
                suppressHydrationWarning
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--faint)] transition hover:bg-white/5 hover:text-[var(--ink)]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {/* Fixed-height slot so errors never shift the layout. */}
          <div aria-live="polite" className="min-h-[34px]">
            {error && (
              <p role="alert" className="entrance rounded-lg border border-[rgba(242,139,130,.35)] bg-[rgba(242,139,130,.10)] px-3 py-2 text-xs font-bold text-[var(--danger)]">
                {error}
              </p>
            )}
          </div>
          <div className="stagger-item" style={{ animationDelay: "340ms" }}>
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[linear-gradient(135deg,#A78BFA,#818CF8)] px-4 py-3 text-sm font-extrabold text-white shadow-[0_10px_30px_rgba(167,139,250,.35)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(167,139,250,.45)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {loading ? <LoaderCircle className="animate-spin" size={16} /> : <Lock size={15} />}
              {loading ? "Logging in..." : "Log in"}
            </button>
          </div>
        </form>
        <p className="stagger-item mt-8 text-center font-mono text-[11px] uppercase tracking-[.15em] text-[var(--faint)]" style={{ animationDelay: "410ms" }}>
          © {new Date().getFullYear()} · Media — Ban Công Nghệ
        </p>
      </div>
    </main>
  );
}
