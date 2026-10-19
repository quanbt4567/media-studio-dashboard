"use client";

import { Crown, LogOut, Palette, PenLine, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession, type Role } from "../../context/SessionContext";

const ROLE_META: Record<Role, { label: string; icon: LucideIcon }> = {
  admin: { label: "Admin", icon: Crown },
  media: { label: "Designer", icon: Palette },
  content: { label: "Writer", icon: PenLine },
};

/** Compact user chip + logout for the top-right header. */
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

  const meta = ROLE_META[user.role];
  const Icon = meta?.icon;

  return (
    <div className="flex items-center gap-2" aria-label="Logged-in user">
      <span
        className="hidden items-center gap-1.5 rounded-full bg-[var(--ink)] px-3 py-2 text-[11px] font-extrabold text-white sm:flex"
        title={`Logged in as ${user.username}`}
      >
        {Icon && <Icon size={13} />}
        {meta?.label ?? user.role}
        <span className="font-medium text-white/60">· {user.username}</span>
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        title="Log out"
        className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white/80 px-3 py-2 text-[11px] font-extrabold text-[var(--muted)] shadow-sm backdrop-blur transition hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-50"
      >
        <LogOut size={13} />
        <span className="hidden sm:inline">{loggingOut ? "..." : "Log out"}</span>
      </button>
    </div>
  );
}
