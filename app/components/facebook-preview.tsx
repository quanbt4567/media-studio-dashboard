"use client";

import { Globe2, MessageCircle, MoreHorizontal, Share2, ThumbsUp, X } from "lucide-react";
import { useEffect, useMemo } from "react";

function renderPostContent(content: string) {
  // Facebook shows post text exactly as typed — no Markdown parsing.
  // Keep the preview honest: render plain lines, no bold substitution.
  const lines = content.split("\n");
  return lines.map((line, index) => <span key={`${line}-${index}`}>{line}{index < lines.length - 1 && <br />}</span>);
}

export default function FacebookPreview({ generatedText, image, video, onRemoveImage, onRemoveVideo }: { generatedText: string; image?: File | string; video?: string; onRemoveImage?: () => void; onRemoveVideo?: () => void }) {
  // Compute the object URL during render instead of setState-in-effect.
  const objectUrl = useMemo(() => {
    if (image && typeof image !== "string") return URL.createObjectURL(image);
    return null;
  }, [image]);

  // Only cleanup here — no setState, so no render cascade.
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  // A string is already a usable URL (e.g. a data URL from the shared post).
  const imageUrl = typeof image === "string" ? image : (objectUrl ?? "");

  return <div className="rounded-2xl border border-white/80 bg-white/65 p-4 shadow-[0_14px_40px_rgba(22,37,34,.08)] backdrop-blur-xl sm:p-5">
    <div className="mb-4 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">Live preview / Facebook post</p><p className="mt-1 text-sm font-black tracking-tight">Public feed appearance</p></div><span className="rounded-full bg-[#e7f6e9] px-2.5 py-1 text-[10px] font-bold text-[#28733f]">Ready to review</span></div>
    <div className="overflow-hidden rounded-xl border border-[#dfe3e7] bg-[#f0f2f5] text-[#050505] shadow-[0_8px_24px_rgba(0,0,0,.08)]">
      <div className="bg-white px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-black text-[var(--lime)]">C</div><div className="min-w-0 flex-1"><p className="text-sm font-bold">BCN</p><p className="flex items-center gap-1 text-[11px] text-[#65676b]">Just now <span>·</span> <Globe2 size={11} /></p></div><MoreHorizontal size={18} className="text-[#65676b]" /></div></div>
      <div className="bg-white px-4 pb-3 pt-1"><p className={`text-sm leading-6 ${generatedText ? "whitespace-pre-wrap" : "text-[#65676b]"}`}>{generatedText ? renderPostContent(generatedText) : "Your post will appear here as you edit it."}</p></div>
      {video ? <div className="relative aspect-[1.75/1] bg-black"><video src={video} controls preload="metadata" className="h-full w-full object-contain" />{onRemoveVideo && <button type="button" onClick={onRemoveVideo} aria-label="Remove uploaded video" className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"><X size={14} /></button>}</div> : imageUrl ? <div className="relative aspect-[1.75/1] bg-[#e9eef0]"><img src={imageUrl} alt="Uploaded post media" className="h-full w-full object-cover" />{onRemoveImage && <button type="button" onClick={onRemoveImage} aria-label="Remove uploaded image" className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"><X size={14} /></button>}</div> : <div className="relative aspect-[1.75/1] overflow-hidden bg-[#dfe9e5] p-5"><div className="absolute -right-8 -top-10 h-40 w-40 rounded-full border-[22px] border-[var(--orange)]/70" /><div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full border-[30px] border-[var(--lime)]" /><div className="relative flex h-full flex-col justify-end"><span className="font-mono text-[10px] uppercase tracking-[.2em] text-[var(--muted)]">BCN / media desk</span><strong className="mt-1 max-w-[230px] text-2xl font-black leading-none tracking-[-.06em]">Make room for good ideas.</strong></div></div>}
      <div className="bg-white px-4"><div className="flex items-center justify-between border-b border-[#e5e5e5] py-2.5 text-[11px] text-[#65676b]"><span>12 reactions</span><span>3 comments · 1 share</span></div><div className="grid grid-cols-3 py-1 text-[#65676b]"><button type="button" className="flex items-center justify-center gap-2 rounded-md py-2 text-xs font-bold hover:bg-[#f2f2f2]"><ThumbsUp size={15} />Like</button><button type="button" className="flex items-center justify-center gap-2 rounded-md py-2 text-xs font-bold hover:bg-[#f2f2f2]"><MessageCircle size={15} />Comment</button><button type="button" className="flex items-center justify-center gap-2 rounded-md py-2 text-xs font-bold hover:bg-[#f2f2f2]"><Share2 size={15} />Share</button></div></div>
    </div>
    <p className="mt-3 text-[10px] leading-relaxed text-[var(--muted)]">The preview mirrors how this post will look on the connected public page.</p>
  </div>;
}
