"use client";

import { Check, CircleDot } from "lucide-react";

export const postStatuses = ["Draft", "Waiting Media", "Review Pending", "Approved", "Published"] as const;
export type PostStatus = (typeof postStatuses)[number];

const statusStyles: Record<PostStatus, string> = {
  Draft: "bg-[var(--fill)] text-[var(--ink)]",
  "Waiting Media": "bg-[#2b2113] text-[#e0a93e]",
  "Review Pending": "bg-[#12303a] text-[#67d7e8]",
  Approved: "bg-[var(--accent)] text-[var(--ink)]",
  Published: "bg-[var(--accent)] text-white",
};

export default function PostStatusSwitcher({ status, onChange, isStatusAllowed }: { status: PostStatus; onChange: (status: PostStatus) => void; isStatusAllowed?: (status: PostStatus) => boolean }) {
  const activeIndex = postStatuses.indexOf(status);
  const allowed = isStatusAllowed ?? (() => true);

  return <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/65 p-4 shadow-[0_14px_40px_rgba(0,0,0,.08)] backdrop-blur-xl">
    <div className="mb-4 flex items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">Workflow status</p><p className="mt-1 text-sm font-black tracking-tight">Approval path</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusStyles[status]}`}><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />{status}</span></div>
    <div className="flex items-start">
      {postStatuses.map((option, index) => { const active = option === status; const complete = activeIndex > index; const permitted = allowed(option); return <div className="flex min-w-0 flex-1 items-start" key={option}><div className="flex min-w-0 flex-1 flex-col items-center"><button type="button" onClick={() => onChange(option)} disabled={!permitted} aria-label={`Set status to ${option}`} className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${active ? "border-[var(--line-strong)] bg-[var(--accent)] text-white shadow-[0_0_0_4px_rgba(139,92,246,.55)]" : complete ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--ink)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]"} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--line)]`}>{complete ? <Check size={14} /> : active ? <CircleDot size={14} /> : <span className="font-mono text-[9px]">{index + 1}</span>}</button><span className={`mt-2 max-w-[86px] text-center text-[9px] font-bold leading-tight ${active ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{option}</span></div>{index < postStatuses.length - 1 && <span className={`mt-4 h-px flex-1 ${complete ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`} />}</div>; })}
    </div>
  </div>;
}
