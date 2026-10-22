"use client";

import { ArrowLeft, MessageCircle, Send, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "../../context/SessionContext";

interface ChatUser {
  username: string;
  role: string;
}

interface ConvSummary {
  id: string;
  type: "dm" | "group";
  title: string;
  participants: string[];
  lastMessage: { from: string; text: string; createdAt: string } | null;
  unread: number;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  from: string;
  text: string;
  createdAt: string;
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

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  media: "Designer",
  content: "Writer",
};

export default function ChatWidget() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations ?? []);
        setUsers(data.users ?? []);
      }
    } catch {
      /* chat is best-effort */
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/chat?conversationId=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (res.ok && data.conversation) {
        setMessages(data.conversation.messages ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Poll the list for unread badges; poll the open thread for new messages.
  useEffect(() => {
    loadList();
    const t = setInterval(() => {
      loadList();
      if (activeIdRef.current) loadThread(activeIdRef.current);
    }, 8000);
    return () => clearInterval(t);
  }, [loadList, loadThread]);

  useEffect(() => {
    if (activeId) {
      loadThread(activeId);
      loadList(); // refresh unread counts after marking read
    }
  }, [activeId, loadThread, loadList]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = draft.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, text }),
      });
      if (res.ok) {
        setDraft("");
        await loadThread(activeId);
        loadList();
      }
    } finally {
      setSending(false);
    }
  }

  const totalUnread = conversations.reduce((n, c) => n + c.unread, 0);
  const active = conversations.find((c) => c.id === activeId);

  function roleOf(username: string): string {
    return ROLE_LABEL[users.find((u) => u.username === username)?.role ?? ""] ?? "";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Tin nhắn nhóm"
        className="fixed bottom-5 right-5 z-[80] flex items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-xl transition hover:-translate-y-0.5"
        style={{ width: 52, height: 52 }}
      >
        <MessageCircle size={22} />
        {totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e5484d] px-1 text-[10px] font-extrabold text-white">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed bottom-20 right-5 z-[80] flex h-[520px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
              {activeId && (
                <button
                  type="button"
                  onClick={() => { setActiveId(null); setMessages([]); }}
                  className="rounded-full p-1 hover:bg-[var(--line)]"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <p className="text-sm font-extrabold">
                {active ? active.title : "Tin nhắn"}
              </p>
              {active?.type === "group" && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--muted)]">
                  <Users size={11} /> {active.participants.length} thành viên
                </span>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto rounded-full p-1 hover:bg-[var(--line)]"
              >
                <X size={16} />
              </button>
            </div>

            {!activeId ? (
              <div className="flex-1 overflow-y-auto p-2">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--fill)]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                      {c.type === "group" ? <Users size={16} /> : <span className="text-xs font-extrabold">{c.title.slice(0, 1).toUpperCase()}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-xs font-extrabold">{c.title}</span>
                        {c.type === "dm" && roleOf(c.title) && (
                          <span className="rounded-full bg-[var(--line)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--muted)]">{roleOf(c.title)}</span>
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--muted)]">
                        {c.lastMessage ? `${c.lastMessage.from === user.username ? "Bạn: " : ""}${c.lastMessage.text}` : "Chưa có tin nhắn"}
                      </span>
                    </span>
                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e5484d] px-1 text-[10px] font-extrabold text-white">
                        {c.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {messages.length === 0 && (
                    <p className="mt-8 text-center text-xs text-[var(--muted)]">
                      {active?.type === "group"
                        ? "Nhóm chat của cả team — thảo luận nhanh tại đây."
                        : "Bắt đầu trò chuyện riêng. Chỉ hai người thấy tin nhắn này."}
                    </p>
                  )}
                  {messages.map((m) => {
                    const mine = m.from === user.username;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "rounded-br-md bg-[var(--accent)] text-white" : "rounded-bl-md bg-[var(--fill)] text-[var(--ink)]"}`}>
                          {!mine && active?.type === "group" && (
                            <p className="mb-0.5 text-[10px] font-extrabold text-[var(--brand)]">{m.from}</p>
                          )}
                          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{m.text}</p>
                          <p className={`mt-1 text-[9px] ${mine ? "text-white/60" : "text-[var(--muted)]"}`}>{timeAgo(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <div className="border-t border-[var(--line)] p-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                      placeholder="Nhắn tin…"
                      maxLength={2000}
                      className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs outline-none focus:border-[var(--line-strong)]"
                    />
                    <button
                      type="button"
                      onClick={send}
                      disabled={sending || !draft.trim()}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white disabled:opacity-40"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
