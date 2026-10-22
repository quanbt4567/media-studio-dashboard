"use client";

import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
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

const COLLAPSED_COUNT = 3;
const MAX_ITEMS = 12;

/** Global recent-activity strip: a few items by default, expandable. */
export default function ActivityFeed({
  posts,
  onSelectPost,
}: {
  posts: Post[];
  onSelectPost: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
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
    .slice(0, MAX_ITEMS);

  if (items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT);
  const canExpand = items.length > COLLAPSED_COUNT;

  return (
    <div className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
        <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[.18em] text-[var(--muted)]">
          <Activity size={12} /> Hoạt động gần đây
        </p>
        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-bold text-[var(--muted)] transition hover:bg-[var(--fill)] hover:text-[var(--ink)]"
          >
            {expanded ? (
              <>Thu gọn <ChevronUp size={12} /></>
            ) : (
              <>Xem tất cả ({items.length}) <ChevronDown size={12} /></>
            )}
          </button>
        )}
      </div>
      <ul className={expanded ? "max-h-72 space-y-1 overflow-y-auto pr-1" : "space-y-1"}>
        {visible.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelectPost(item.postId)}
              className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-[var(--fill)]"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span className="w-24 shrink-0 text-[11px] text-[var(--muted)]">{timeAgo(item.at)}</span>
              <span className="min-w-0 flex-1 line-clamp-2 sm:line-clamp-none sm:truncate">
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
