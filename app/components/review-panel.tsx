"use client";

import { Check, MessageSquare, Send, Undo2, X } from "lucide-react";
import { useState } from "react";
import type { Post } from "../lib/posts-store";

const roleBadge: Record<string, string> = {
  admin: "bg-[#e6d9f5] text-[#5b2d8e]",
  content: "bg-[#eef1e8] text-[var(--ink)]",
  media: "bg-[#fff1d6] text-[#8b5d16]",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ReviewPanel({
  post,
  role,
  onPostUpdated,
}: {
  post: Post;
  role: "content" | "media" | "admin";
  onPostUpdated: (post: Post) => void;
}) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");

  async function sendComment() {
    const text = comment.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send the comment.");
      onPostUpdated(data.post);
      setComment("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send the comment.");
    } finally {
      setSending(false);
    }
  }

  async function review(decision: "approved" | "rejected", sendBackTo: "writer" | "designer" = "writer") {
    if (reviewing) return;
    if (decision === "rejected" && !reviewNote.trim()) {
      setError("Please write a note so the team knows what to fix.");
      return;
    }
    setReviewing(true);
    setError("");
    try {
      const response = await fetch(`/api/posts/${post.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: reviewNote.trim(), sendBackTo }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Review failed.");
      onPostUpdated(data.post);
      setReviewNote("");
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Review failed.");
    } finally {
      setReviewing(false);
    }
  }

  const inReview = post.status === "Review Pending";

  return (
    <div className="rounded-2xl border border-white/80 bg-white/65 p-4 shadow-[0_14px_40px_rgba(22,37,34,.08)] backdrop-blur-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">Duyệt bài</p>
          <p className="mt-1 text-sm font-black tracking-tight">Thảo luận & duyệt</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-[#eef1e8] px-2.5 py-1 text-[10px] font-bold text-[var(--muted)]">
          <MessageSquare size={12} /> {post.comments.length}
        </span>
      </div>

      {/* One-click review for admins — sticky so it's always reachable */}
      {role === "admin" && (
        <div className="sticky top-4 z-10 mb-4 rounded-xl border border-[var(--ink)] bg-[#fafbf7] p-3 shadow-[0_8px_24px_rgba(22,37,34,.12)]">
          {inReview ? (
            <>
              <p className="mb-2 text-xs font-extrabold">Duyệt nhanh — một chạm, không cần Zalo</p>
              {post.visualSkipped && (
                <p className="mb-2 rounded-lg bg-[#fff8e6] px-2.5 py-2 text-[11px] font-bold text-[#8b5d16]">⚡ Writer gửi thẳng (bài text-only, không qua designer) — duyệt là đăng được ngay.</p>
              )}
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Note for the team (required when rejecting)…"
                rows={2}
                className="mb-2 w-full resize-none rounded-xl border border-[var(--line)] bg-white p-2.5 text-xs outline-none placeholder:text-[#a8b0a7] focus:border-[var(--ink)]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => review("approved")}
                  disabled={reviewing}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#28733f] px-3 py-2 text-xs font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Check size={14} /> {reviewing ? "Đang xử lý…" : "Đồng ý duyệt"}
                </button>
              </div>
              <p className="mb-1.5 mt-3 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">Trả bài về cho:</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => review("rejected", "writer")}
                  disabled={reviewing}
                  title="Lỗi ở nội dung chữ — trả về cho writer sửa"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#a74331] px-3 py-2 text-xs font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Undo2 size={14} /> {reviewing ? "Working…" : "↩ Writer"}
                </button>
                <button
                  type="button"
                  onClick={() => review("rejected", "designer")}
                  disabled={reviewing}
                  title="Lỗi ở hình ảnh/video — trả về cho designer sửa"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#b07a2a] px-3 py-2 text-xs font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Undo2 size={14} /> {reviewing ? "Working…" : "↩ Designer"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              {post.status === "Published"
                ? "This post has been published."
                : "Review opens when the media team marks the post “Review Pending”."}
            </p>
          )}
          {post.review && (
            <p className={`mt-2 rounded-lg px-2.5 py-2 text-[11px] font-bold ${post.review.decision === "approved" ? "bg-[#e7f6e9] text-[#28733f]" : "bg-[#fff0ec] text-[#a74331]"}`}>
              {post.review.decision === "approved" ? "✓ Đã duyệt" : <span className="flex items-center gap-1"><X size={12} /> Trả về cho {post.review.sendBackTo === "designer" ? "designer" : "writer"}</span>} bởi {post.review.by}
              {post.review.note && <span className="mt-0.5 block font-medium">“{post.review.note}”</span>}
            </p>
          )}
        </div>
      )}

      {error && <p className="mb-3 rounded-lg bg-[#fff0ec] px-3 py-2 text-xs font-bold text-[#b8543c]">{error}</p>}

      {/* Comments */}
      <div className="mb-3 max-h-56 space-y-2.5 overflow-y-auto pr-1">
        {post.comments.length === 0 && (
          <p className="rounded-xl bg-[#fafbf7] px-3 py-4 text-center text-[11px] text-[var(--muted)]">
            No comments yet — discuss the draft right here instead of Zalo.
          </p>
        )}
        {post.comments.map((c) => (
          <div key={c.id} className="rounded-xl bg-[#fafbf7] px-3 py-2.5">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11px] font-extrabold">{c.author}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase ${roleBadge[c.role] ?? "bg-[#eef1e8]"}`}>{c.role}</span>
              <span className="ml-auto font-mono text-[9px] text-[var(--muted)]">{timeAgo(c.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed">{c.text}</p>
          </div>
        ))}
      </div>
      {post.status === "Published" ? (
        <p className="rounded-xl bg-[#eef1e8] px-3 py-2.5 text-center text-[11px] font-bold text-[var(--muted)]">
          🔒 Bài đã xuất bản — chỉ xem lại, không thể bình luận thêm.
        </p>
      ) : (
      <div className="flex gap-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendComment(); }}
          placeholder="Write a comment for the team…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs outline-none placeholder:text-[#a8b0a7] focus:border-[var(--ink)]"
        />
        <button
          type="button"
          onClick={sendComment}
          disabled={!comment.trim() || sending}
          aria-label="Send comment"
          className="flex items-center justify-center rounded-xl bg-[var(--ink)] px-3.5 text-white transition hover:bg-[#263b35] disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </div>
      )}

      {/* Activity timeline */}
      {post.activity.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-[11px] font-extrabold text-[var(--muted)] hover:text-[var(--ink)]">
            Activity timeline ({post.activity.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {post.activity.slice(0, 12).map((entry) => (
              <li key={entry.id} className="flex items-baseline gap-2 text-[11px]">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--lime)]" />
                <span className="text-[var(--muted)]">{timeAgo(entry.at)}</span>
                <span><strong>{entry.by}</strong> {entry.action}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
