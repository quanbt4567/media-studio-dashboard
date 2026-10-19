"use client";

import { Activity } from "lucide-react";
import type { Post } from "../lib/posts-store";

interface FeedItem {
  id: string;
  at: string;
  by: string;
  action: string;
  postId: string;
  postTitle: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

/** Global recent-activity strip pinned near the top of the studio. */
export default function ActivityFeed({
  posts,
  onSelectPost,
}: {
  posts: Post[];
  onSelectPost: (id: string) => void;
}) {
  const items: FeedItem[] = posts
    .flatMap((p) =>
      (p.activity ?? []).map((a) => ({
        id: a.id,
        at: a.at,
        by: a.by,
        action: a.action,
        postId: p.id,
        postTitle: p.content.slice(0, 42) || "Bài viết",
      })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  if (items.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-[var(--line)] bg-white p-3">
      <p className="mb-2 flex items-center gap-1.5 px-1 font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">
        <Activity size={12} /> Hoạt động gần đây
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelectPost(item.postId)}
              className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-[#f2f4ec]"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--lime)]" />
              <span className="shrink-0 text-[var(--muted)]">{timeAgo(item.at)}</span>
              <span className="min-w-0 flex-1 truncate">
                <strong>{item.by}</strong> {item.action}
                <span className="text-[var(--muted)]"> — {item.postTitle}{item.postTitle.length >= 42 ? "…" : ""}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
