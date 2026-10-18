"use client";

import { Check, CircleDot } from "lucide-react";

export const postStatuses = ["Draft", "Waiting Media", "Review Pending", "Approved"] as const;
export type PostStatus = (typeof postStatuses)[number];

const statusStyles: Record<PostStatus, string> = {
  Draft: "bg-[#eef1e8] text-[var(--ink)]",
  "Waiting Media": "bg-[#fff1d6] text-[#8b5d16]",
  "Review Pending": "bg-[#dceceb] text-[#28645e]",
  Approved: "bg-[var(--lime)] text-[var(--ink)]",
};

export default function PostStatusSwitcher({ status, onChange, isStatusAllowed }: { status: PostStatus; onChange: (status: PostStatus) => void; isStatusAllowed?: (status: PostStatus) => boolean }) {
  const activeIndex = postStatuses.indexOf(status);
  const allowed = isStatusAllowed ?? (() => true);

  return <div className="rounded-2xl border border-white/80 bg-white/65 p-4 shadow-[0_14px_40px_rgba(22,37,34,.08)] backdrop-blur-xl">
    <div className="mb-4 flex items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">Workflow status</p><p className="mt-1 text-sm font-black tracking-tight">Approval path</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusStyles[status]}`}><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />{status}</span></div>
    <div className="flex items-start">
      {postStatuses.map((option, index) => { const active = option === status; const complete = activeIndex > index; const permitted = allowed(option); return <div className="flex min-w-0 flex-1 items-start" key={option}><div className="flex min-w-0 flex-1 flex-col items-center"><button type="button" onClick={() => onChange(option)} disabled={!permitted} aria-label={`Set status to ${option}`} className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${active ? "border-[var(--ink)] bg-[var(--ink)] text-white shadow-[0_0_0_4px_rgba(217,245,106,.55)]" : complete ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-[#dce3d9] bg-white text-[var(--muted)] hover:border-[var(--ink)]"} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#dce3d9]`}>{complete ? <Check size={14} /> : active ? <CircleDot size={14} /> : <span className="font-mono text-[9px]">{index + 1}</span>}</button><span className={`mt-2 max-w-[86px] text-center text-[9px] font-bold leading-tight ${active ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{option}</span></div>{index < postStatuses.length - 1 && <span className={`mt-4 h-px flex-1 ${complete ? "bg-[var(--lime)]" : "bg-[#dce3d9]"}`} />}</div>; })}
    </div>
  </div>;
}
