"use client";

import { CalendarDays, Clock, Rocket } from "lucide-react";
import { useMemo, useState } from "react";
import type { Post } from "../lib/posts-store";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dayKey(d);
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ContentCalendar({
  posts,
  role,
  dueCount,
  onSelectPost,
  onPublishDue,
  publishingDue,
}: {
  posts: Post[];
  role: "content" | "media" | "admin";
  dueCount: number;
  onSelectPost: (id: string) => void;
  onPublishDue: () => void;
  publishingDue: boolean;
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    // Monday-first offset.
    const offset = (first.getDay() + 6) % 7;
    const days: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) days.push(null);
    const dim = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return days;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      const stamp = post.publishedAt || post.scheduledAt;
      if (!stamp) continue;
      const key = parseDay(stamp);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [posts]);

  const selectedPosts = selectedDay ? (byDay.get(selectedDay) ?? []) : [];
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayKey = dayKey(new Date());

  function moveMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    setSelectedDay(null);
  }

  return (
    <div className="rounded-[28px] border border-white/75 bg-white/70 p-4 shadow-[0_24px_80px_rgba(22,37,34,.12)] backdrop-blur-2xl sm:p-7 entrance">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--lime)]"><CalendarDays size={14} /></span>
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[var(--muted)]">Content calendar</p>
            <h2 className="text-xl font-black tracking-[-.04em]">Plan the month.</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" className="rounded-full border border-[var(--line)] bg-white/70 px-3 py-1.5 text-xs font-extrabold hover:border-[var(--ink)]">←</button>
          <span className="min-w-[140px] text-center text-sm font-extrabold">{monthLabel}</span>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Next month" className="rounded-full border border-[var(--line)] bg-white/70 px-3 py-1.5 text-xs font-extrabold hover:border-[var(--ink)]">→</button>
        </div>
      </div>

      {role === "admin" && dueCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#f3c2b8] bg-[#fff0ec] px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-extrabold text-[#a74331]">
            <Clock size={14} /> {dueCount} post{dueCount === 1 ? "" : "s"} past {dueCount === 1 ? "its" : "their"} scheduled time
          </p>
          <button
            type="button"
            onClick={onPublishDue}
            disabled={publishingDue}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-[#1877F2] px-4 py-2 text-xs font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Rocket size={13} /> {publishingDue ? "Publishing…" : "Publish due now"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">{d}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const key = dayKey(date);
          const list = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          const selected = key === selectedDay;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDay(selected ? null : key)}
              className={`min-h-[74px] rounded-xl border p-1.5 text-left transition ${selected ? "border-[var(--ink)] bg-white shadow-[0_8px_20px_rgba(22,37,34,.12)]" : "border-[var(--line)] bg-white/50 hover:border-[var(--ink)]"} ${isToday ? "ring-2 ring-[var(--lime)]" : ""}`}
            >
              <span className={`text-[11px] font-extrabold ${isToday ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{date.getDate()}</span>
              <div className="mt-1 space-y-1">
                {list.slice(0, 2).map((post) => (
                  <span
                    key={post.id}
                    className={`block line-clamp-2 rounded-md px-1.5 py-0.5 text-[9px] font-bold leading-snug ${post.status === "Published" ? "bg-[#1877F2] text-white" : "bg-[#fff1d6] text-[#8b5d16]"}`}
                  >
                    {post.status === "Published" ? "✓ " : "◷ "}{(post.content.split("\n")[0] || "Untitled").slice(0, 42)}
                  </span>
                ))}
                {list.length > 2 && <span className="block px-1.5 text-[9px] font-bold text-[var(--muted)]">+{list.length - 2} more</span>}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white/60 p-4">
          <p className="mb-2 text-xs font-extrabold">
            {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
            <span className="ml-2 font-medium text-[var(--muted)]">{selectedPosts.length} post{selectedPosts.length === 1 ? "" : "s"}</span>
          </p>
          {selectedPosts.length === 0 ? (
            <p className="text-[11px] text-[var(--muted)]">Nothing scheduled this day. Set a date on a post in the Studio tab to plan it here.</p>
          ) : (
            <div className="space-y-2">
              {selectedPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onSelectPost(post.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-left transition hover:border-[var(--ink)]"
                >
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${post.status === "Published" ? "bg-[#1877F2] text-white" : "bg-[#fff1d6] text-[#8b5d16]"}`}>{post.status}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold">{(post.content.split("\n")[0] || "Untitled draft").slice(0, 60)}</span>
                  <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
                    {new Date(post.publishedAt || post.scheduledAt || "").toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-[var(--muted)]">
        Schedule a post from the Studio tab — approved posts go out automatically via the <span className="font-mono">/api/publish-due</span> endpoint.
        Vercel Cron hits it every 5 minutes (see <span className="font-mono">vercel.json</span>; authentication is automatic).
      </p>
    </div>
  );
}
