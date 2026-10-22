"use client";

import gsap from "gsap";
import { Clock, Hash, Lightbulb, LoaderCircle, Plus, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Post } from "../lib/posts-store";
import { prefersReducedMotion } from "./fx/motion";

interface Idea {
  title: string;
  angle: string;
  hashtags: string[];
  bestTime: string;
}

interface Preset {
  id: string;
  label: string;
}

export default function IdeaGenerator({
  canCreate,
  onDraftCreated,
}: {
  canCreate: boolean;
  onDraftCreated: (post: Post) => void;
}) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [eventId, setEventId] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [topicUsed, setTopicUsed] = useState("");
  const [loading, setLoading] = useState(false);
  /** Idea card whose "what do you want to write" composer is open. */
  const [draftFor, setDraftFor] = useState<number | null>(null);
  const [brief, setBrief] = useState("");
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  // Idea cards stagger in when a fresh batch arrives.
  useEffect(() => {
    if (!gridRef.current || ideas.length === 0 || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      gridRef.current.children,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", stagger: 0.07 },
    );
    return () => {
      tween.kill();
    };
  }, [ideas]);

  useEffect(() => {
    fetch("/api/ideas")
      .then((r) => r.json())
      .then((data) => { if (data.presets) setPresets(data.presets); })
      .catch(() => {});
  }, []);

  async function generate() {
    const payload = eventId ? { eventId } : { customTopic: customTopic.trim() };
    if (!eventId && !customTopic.trim()) {
      setError("Pick an event or describe a custom topic first.");
      return;
    }
    setLoading(true);
    setError("");
    setIdeas([]);
    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate ideas.");
      setIdeas(data.ideas || []);
      setTopicUsed(data.topic || "");
    } catch (genError) {
      setError(genError instanceof Error ? genError.message : "Could not generate ideas.");
    } finally {
      setLoading(false);
    }
  }

  /** Open the "what do you want to write" composer for an idea (prefilled with the idea itself). */
  function openDraftComposer(idea: Idea, index: number) {
    setDraftFor(index);
    setBrief(`${idea.title}\n${idea.angle}`);
    setError("");
  }

  /** AI writes the full post from the idea + the writer's brief, then saves it as a draft. */
  async function handleGenerateDraft(idea: Idea, index: number) {
    if (!canCreate || writing) return;
    const topic = brief.replace(/\s+/g, " ").trim().slice(0, 240);
    if (topic.length < 10) {
      setError("Mô tả thêm vài ý bạn muốn viết (ít nhất 10 ký tự) để AI viết đúng ý.");
      return;
    }
    setWriting(true);
    setError("");
    try {
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || "AI viết bài thất bại.");
      let content = typeof genData.content === "string" ? genData.content.trim() : "";
      if (!content) throw new Error("AI không trả về nội dung.");
      const tags = idea.hashtags.join(" ");
      if (tags && !content.includes("#")) content = `${content}\n\n${tags}`;
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create the draft.");
      setDraftFor(null);
      onDraftCreated(data.post);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create the draft.");
    } finally {
      setWriting(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-[#12151d]/80 p-4 shadow-[0_24px_80px_rgba(0,0,0,.12)] backdrop-blur-2xl sm:p-7 entrance">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]"><Lightbulb size={14} /></span>
        <div>
          <p className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[var(--muted)]">AI idea generator</p>
          <h2 className="text-xl font-black tracking-[-.04em]">Never run out of ideas.</h2>
        </div>
      </div>

      <p className="mb-3 text-xs font-extrabold">What&apos;s the occasion?</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {presets.map((preset) => {
          const active = eventId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => { setEventId(active ? "" : preset.id); setCustomTopic(""); }}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${active ? "border-[var(--line-strong)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white/[0.05] hover:border-[var(--accent)]"}`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={customTopic}
          onChange={(e) => { setCustomTopic(e.target.value); setEventId(""); }}
          placeholder="Or describe a custom topic…"
          maxLength={200}
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--faint)] focus:border-[var(--line-strong)]"
        />
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-40"
        >
          {loading ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? "Đang nghĩ…" : "Tạo ý tưởng"}
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-[#2b1a1e] px-3 py-2 text-xs font-bold text-[#f0957e]">{error}</p>}

      {topicUsed && ideas.length > 0 && (
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[.15em] text-[var(--muted)]">
          5 ideas for “{topicUsed}”
        </p>
      )}
      <div ref={gridRef} className="grid gap-3 md:grid-cols-2">
        {ideas.map((idea, index) => (
          <div key={index} className="flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <p className="text-sm font-extrabold leading-snug">{idea.title}</p>
            <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[var(--muted)]">{idea.angle}</p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-2)]"><Hash size={11} />{idea.hashtags.join(" ")}</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-[var(--muted)]"><Clock size={11} />Giờ đăng gợi ý: {idea.bestTime || "—"}</p>
            {canCreate ? (
              draftFor === index ? (
                <div className="mt-3 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] p-3">
                  <label htmlFor={`brief-${index}`} className="mb-1.5 block text-[11px] font-extrabold">
                    Bạn muốn viết gì?
                  </label>
                  <textarea
                    id={`brief-${index}`}
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    rows={4}
                    autoFocus
                    placeholder="Thêm chi tiết: thời gian, địa điểm, đối tượng, giọng văn, ý bắt buộc có…"
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 text-xs leading-relaxed outline-none placeholder:text-[var(--faint)] focus:border-[var(--line-strong)]"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateDraft(idea, index)}
                      disabled={writing}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-[11px] font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-40"
                    >
                      {writing ? <LoaderCircle size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {writing ? "AI đang viết…" : "AI viết bài & tạo nháp"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftFor(null)}
                      disabled={writing}
                      className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[11px] font-bold text-[var(--muted)] transition hover:text-[var(--ink)] disabled:opacity-40"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openDraftComposer(idea, index)}
                  disabled={writing}
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-[11px] font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-40"
                >
                  <Plus size={13} /> Dùng làm bản nháp
                </button>
              )
            ) : (
              <p className="mt-3 text-[10px] text-[var(--muted)]">Đăng nhập vai trò writer để tạo bản nháp từ ý tưởng này.</p>
            )}
          </div>
        ))}
      </div>
      {!loading && ideas.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-4 py-8 text-center text-xs text-[var(--muted)]">
          Pick an event above and let Gemini brainstorm your next 5 posts.
        </p>
      )}
    </div>
  );
}
