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

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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
  const [statusFilter, setStatusFilter] = useState<"all" | "Published" | "scheduled" | "Review Pending">("all");

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
      if (statusFilter === "Published" && post.status !== "Published") continue;
      if (statusFilter === "scheduled" && (post.status === "Published" || !post.scheduledAt)) continue;
      if (statusFilter === "Review Pending" && post.status !== "Review Pending") continue;
      const stamp = post.publishedAt || post.scheduledAt;
      if (!stamp) continue;
      const key = parseDay(stamp);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [posts, statusFilter]);

  const selectedPosts = selectedDay ? (byDay.get(selectedDay) ?? []) : [];
  const monthLabel = cursor.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const todayKey = dayKey(new Date());

  function moveMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    setSelectedDay(null);
  }

  return (
    <div className="rounded-[20px] border border-[var(--glass-border)] bg-[var(--glass)] p-4 shadow-[0_24px_80px_rgba(0,0,0,.12)] backdrop-blur-2xl sm:p-7 entrance">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]"><CalendarDays size={14} /></span>
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[.18em] text-[var(--muted)]">Lịch nội dung</p>
            <h2 className="text-xl font-black tracking-[-.04em]">Kế hoạch tháng.</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Tháng trước" className="rounded-full border border-[var(--line)] bg-white/[0.06] px-3 py-1.5 text-xs font-extrabold hover:border-[var(--accent)]">←</button>
          <span className="min-w-[140px] text-center text-sm font-extrabold">{monthLabel}</span>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Tháng sau" className="rounded-full border border-[var(--line)] bg-white/[0.06] px-3 py-1.5 text-xs font-extrabold hover:border-[var(--accent)]">→</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo trạng thái">
        {(
          [
            ["all", "Tất cả"],
            ["Published", "Đã đăng"],
            ["scheduled", "Đã lên lịch"],
            ["Review Pending", "Chờ duyệt"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold transition ${statusFilter === key ? "bg-[var(--accent)] text-white" : "border border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {role === "admin" && dueCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-tint)] px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-extrabold text-[var(--danger-text)]">
            <Clock size={14} /> {dueCount} bài đã quá giờ hẹn đăng
          </p>
          <button
            type="button"
            onClick={onPublishDue}
            disabled={publishingDue}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Rocket size={13} /> {publishingDue ? "Đang đăng…" : "Đăng ngay"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">{d}</div>
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
              className={`min-h-[74px] rounded-xl border p-1.5 text-left transition ${selected ? "border-[var(--line-strong)] bg-[var(--surface)] shadow-[0_8px_20px_rgba(0,0,0,.12)]" : "border-[var(--line)] bg-[var(--surface)]/50 hover:border-[var(--accent)]"} ${isToday ? "ring-2 ring-[var(--accent)]" : ""}`}
            >
              <span className={`text-[11px] font-extrabold ${isToday ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{date.getDate()}</span>
              <div className="mt-1 space-y-1">
                {list.slice(0, 2).map((post) => (
                  <span
                    key={post.id}
                    className={`block line-clamp-2 rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-snug ${post.status === "Published" ? "bg-[var(--accent)] text-white" : "bg-[var(--amber-tint)] text-[var(--amber-text)]"}`}
                  >
                    {post.status === "Published" ? "✓ " : "◷ "}{(post.content.split("\n")[0] || "Untitled").slice(0, 42)}
                  </span>
                ))}
                {list.length > 2 && <span className="block px-1.5 text-[11px] font-bold text-[var(--muted)]">+{list.length - 2} bài nữa</span>}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white/[0.04] p-4">
          <p className="mb-2 text-xs font-extrabold">
            {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
            <span className="ml-2 font-medium text-[var(--muted)]">{selectedPosts.length} bài</span>
          </p>
          {selectedPosts.length === 0 ? (
            <p className="text-[11px] text-[var(--muted)]">Chưa có bài nào hôm nay. Đặt lịch cho bài ở tab Studio để lên kế hoạch tại đây.</p>
          ) : (
            <>
            {selectedPosts.filter((pp) => pp.status !== "Published").length >= 2 && (
              <p className="mb-2 rounded-lg bg-[var(--amber-tint)] px-3 py-2 text-[11px] font-bold text-[var(--amber-text)]">
                ⚠ Có {selectedPosts.filter((pp) => pp.status !== "Published").length} bài dự kiến đăng cùng ngày — cân nhắc giãn cách để mỗi bài đều có đất diễn.
              </p>
            )}
            <div className="space-y-2">
              {selectedPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onSelectPost(post.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-left transition hover:border-[var(--accent)]"
                >
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${post.status === "Published" ? "bg-[var(--accent)] text-white" : "bg-[var(--amber-tint)] text-[var(--amber-text)]"}`}>{post.status}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold">{(post.content.split("\n")[0] || "Untitled draft").slice(0, 60)}</span>
                  <span className="shrink-0 font-mono text-[11px] text-[var(--muted)]">
                    {new Date(post.publishedAt || post.scheduledAt || "").toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
              ))}
            </div>
            </>
          )}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-[var(--muted)]">
        Lên lịch từ tab Studio — bài đã duyệt sẽ tự đăng đúng giờ qua endpoint <span className="font-mono">/api/publish-due</span> (được gọi mỗi 5 phút; có thêm một lượt dự phòng hằng ngày).
      </p>
    </div>
  );
}
