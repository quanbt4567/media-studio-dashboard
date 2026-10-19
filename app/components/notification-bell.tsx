"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Ntf {
  id: string;
  message: string;
  postId?: string;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function NotificationBell({ onSelectPost }: { onSelectPost: (id: string) => void }) {
  const [items, setItems] = useState<Ntf[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (res.ok) {
        setItems(data.notifications ?? []);
        setUnread(data.unread ?? 0);
      }
    } catch {
      /* notifications are best-effort */
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  async function toggle() {
    const next = !open;
    if (next && btnRef.current) {
      // Anchor the panel under the bell, measured in viewport coords so the
      // portal (rendered at document.body) lands in the right place.
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen(next);
    if (next && unread > 0) {
      // Opening the panel marks everything as read.
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => {});
      setUnread(0);
    }
  }

  function goToPost(item: Ntf) {
    if (!item.postId) return;
    setOpen(false);
    onSelectPost(item.postId);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Thông báo"
        title="Thông báo"
        className="relative flex items-center justify-center rounded-full border border-[var(--line)] bg-white/80 p-2.5 text-[var(--ink)] shadow-sm backdrop-blur transition hover:-translate-y-0.5"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d43d2a] px-1 text-[10px] font-extrabold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[70] max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[0_24px_60px_rgba(22,37,34,.18)]"
            style={{ top: pos.top, right: pos.right }}
          >
            <p className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-extrabold"><Bell size={13} /> Thông báo</p>
            {items.length === 0 ? (
              <p className="px-2.5 pb-3 pt-1 text-center text-xs text-[var(--muted)]">Chưa có thông báo nào.</p>
            ) : (
              items.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToPost(item)}
                  disabled={!item.postId}
                  className="mb-1 block w-full rounded-xl px-2.5 py-2 text-left transition hover:bg-[#f4f6ef] disabled:cursor-default"
                >
                  <p className="text-xs font-bold leading-snug">{item.message}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{timeAgo(item.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
