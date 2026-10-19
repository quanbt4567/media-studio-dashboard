"use client";

import { Clock, Hash, Lightbulb, LoaderCircle, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { Post } from "../lib/posts-store";

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
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const [error, setError] = useState("");

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

  async function handleUseAsDraft(idea: Idea, index: number) {
    if (!canCreate || creatingId !== null) return;
    setCreatingId(index);
    setError("");
    try {
      const starter = `${idea.title}\n\n${idea.angle}\n\n${idea.hashtags.join(" ")}`;
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: starter }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create the draft.");
      onDraftCreated(data.post);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create the draft.");
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <div className="rounded-[28px] border border-white/75 bg-white/70 p-4 shadow-[0_24px_80px_rgba(22,37,34,.12)] backdrop-blur-2xl sm:p-7 entrance">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--lime)]"><Lightbulb size={14} /></span>
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
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${active ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white/60 hover:border-[var(--ink)]"}`}
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
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[#fafbf7] px-3 py-2.5 text-sm outline-none placeholder:text-[#a8b0a7] focus:border-[var(--ink)]"
        />
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-xs font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-40"
        >
          {loading ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? "Đang nghĩ…" : "Tạo ý tưởng"}
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-[#fff0ec] px-3 py-2 text-xs font-bold text-[#b8543c]">{error}</p>}

      {topicUsed && ideas.length > 0 && (
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[.15em] text-[var(--muted)]">
          5 ideas for “{topicUsed}”
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {ideas.map((idea, index) => (
          <div key={index} className="flex flex-col rounded-2xl border border-[var(--line)] bg-white/70 p-4">
            <p className="text-sm font-extrabold leading-snug">{idea.title}</p>
            <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[var(--muted)]">{idea.angle}</p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-[#1877F2]"><Hash size={11} />{idea.hashtags.join(" ")}</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-[var(--muted)]"><Clock size={11} />Giờ đăng gợi ý: {idea.bestTime || "—"}</p>
            {canCreate ? (
              <button
                type="button"
                onClick={() => handleUseAsDraft(idea, index)}
                disabled={creatingId !== null}
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--ink)] px-3 py-2 text-[11px] font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-40"
              >
                <Plus size={13} /> {creatingId === index ? "Đang tạo…" : "Dùng làm bản nháp"}
              </button>
            ) : (
              <p className="mt-3 text-[10px] text-[var(--muted)]">Đăng nhập vai trò writer để tạo bản nháp từ ý tưởng này.</p>
            )}
          </div>
        ))}
      </div>
      {!loading && ideas.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--line)] bg-[#fafbf7] px-4 py-8 text-center text-xs text-[var(--muted)]">
          Pick an event above and let Gemini brainstorm your next 5 posts.
        </p>
      )}
    </div>
  );
}
