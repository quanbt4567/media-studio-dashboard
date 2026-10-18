"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "../../context/SessionContext";

const ROLE_LABEL: Record<string, string> = {
  content: "✍️ Content Creator",
  media: "🎨 Media Creator",
  admin: "👑 Admin / Leader",
};

/** Shows the logged-in user and their role, with a logout button. */
export default function UserBadge() {
  const { user } = useSession();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Logged-in user">
      <span className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">
        Logged in as
      </span>
      <span className="flex items-center gap-1.5 rounded-full border border-[var(--ink)] bg-[var(--ink)] px-3.5 py-2 text-xs font-extrabold text-white">
        {ROLE_LABEL[user.role] ?? user.role}
      </span>
      <span className="text-xs font-bold text-[var(--muted)]">{user.username}</span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="ml-auto flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white/70 px-3 py-2 text-[11px] font-extrabold text-[var(--muted)] transition hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-50"
      >
        <LogOut size={13} />
        {loggingOut ? "Logging out..." : "Log out"}
      </button>
    </div>
  );
}
