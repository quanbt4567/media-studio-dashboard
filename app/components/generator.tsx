"use client";

import { Clipboard, LoaderCircle, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";
import FacebookPostBox, { CreatePostData } from "./facebook-post-box";
import FacebookPreview from "./facebook-preview";
import PostStatusSwitcher, { PostStatus } from "./post-status-switcher";

const blockedTerms = [
  "ignore previous",
  "forget previous",
  "system prompt",
  "jailbreak",
  "act as someone else",
  "illegal",
  "malware",
  "spam",
];

export default function Generator() {
  const [topic, setTopic] = useState("");
  const [postContent, setPostContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<PostStatus>("Draft");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [publishError, setPublishError] = useState("");

  async function generatePost() {
    const cleanTopic = topic.trim();
    const normalizedTopic = cleanTopic.toLowerCase();

    if (cleanTopic.length < 5) {
      setError("Please enter at least 5 characters for a specific topic.");
      return;
    }

    if (cleanTopic.length > 240) {
      setError("Please keep your topic under 240 characters.");
      return;
    }

    if (blockedTerms.some((term) => normalizedTopic.includes(term))) {
      setError("This topic contains restricted instructions or content.");
      return;
    }

    setLoading(true); setError(""); setCopied(false);
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: cleanTopic }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      setPostContent(data.content);
      setStatus("Draft");
      setPublished(false);
      setShowSuccessToast(false);
      setPublishError("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  async function copyPost() { if (!postContent) return; await navigator.clipboard.writeText(postContent); setCopied(true); setTimeout(() => setCopied(false), 1800); }

  function handlePostSubmit({ content }: CreatePostData) {
    setPostContent(content);
    setStatus("Review Pending");
  }

  async function handlePublishToFacebook() {
    if (!postContent.trim() || publishing || published) return;

    setPublishing(true);
    setError("");
    setPublishError("");
    try {
      const [response] = await Promise.all([
        fetch("/api/publish-facebook", {
          method: "POST",
          body: (() => {
            const formData = new FormData();
            formData.append("message", postContent.trim());
            if (mediaFile) formData.append("image", mediaFile, mediaFile.name);
            return formData;
          })(),
        }),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The post could not be published.");

      setPublished(true);
      setStatus("Approved");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3500);
    } catch (publishError) {
      setPublishError(publishError instanceof Error ? publishError.message : "The post could not be published.");
    } finally {
      setPublishing(false);
    }
  }

  return <div className="rounded-[28px] border border-white/75 bg-white/70 p-4 shadow-[0_24px_80px_rgba(22,37,34,.12)] backdrop-blur-2xl sm:p-7 entrance" style={{ animationDelay: "180ms" }}>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><div className="mb-2 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--lime)]"><Sparkles size={14} /></span><span className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[var(--muted)]">Studio assistant</span></div><h2 className="text-2xl font-black tracking-[-.05em]">Make something people feel.</h2><p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--muted)]">Turn a rough idea into a Facebook-ready post in seconds.</p></div><span className="rounded-full bg-[#eef1e8] px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">AI powered</span></div>
    <label className="mb-2 block text-xs font-extrabold" htmlFor="topic">What are we talking about?</label><textarea suppressHydrationWarning id="topic" value={topic} maxLength={240} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Friday's pottery workshop for beginners..." className="min-h-28 w-full resize-none rounded-xl border border-[var(--line)] bg-[#fafbf7] p-3 text-sm outline-none transition placeholder:text-[#a8b0a7] focus:border-[var(--ink)] focus:ring-2 focus:ring-[var(--lime)]" />
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-[10px] text-[var(--muted)]">{topic.length}/240 characters</p><button disabled={!topic.trim() || loading} onClick={generatePost} className="flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-xs font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#263b35] disabled:cursor-not-allowed disabled:opacity-40">{loading ? <LoaderCircle className="animate-spin" size={15} /> : <WandSparkles size={15} />} {loading ? "Writing..." : "Generate with AI"}</button></div>
    {error && <p className="mt-4 rounded-lg bg-[#fff0ec] px-3 py-2 text-xs font-bold text-[#b8543c]">{error}</p>}
    <div className="mt-6 grid items-start gap-5 border-t border-dashed border-[var(--line)] pt-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.85fr)]">
      <section aria-label="Raw post content">
        <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--orange)]" /><span className="font-mono text-[10px] uppercase tracking-[.17em] text-[var(--muted)]">Raw content / composer</span></div>{postContent && <button onClick={copyPost} className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--muted)] hover:text-[var(--ink)]"><Clipboard size={13} />{copied ? "Copied" : "Copy post"}</button>}</div>
        <FacebookPostBox value={postContent} onChange={setPostContent} image={mediaFile} onImageChange={setMediaFile} onSubmit={handlePostSubmit} userName="Clubhouse Media Desk" placeholder="Your AI-generated post will appear here. Edit it before posting..." />
      </section>
      <section aria-label="Facebook preview" className="space-y-5">
        <PostStatusSwitcher status={status} onChange={setStatus} />
        <FacebookPreview generatedText={postContent} image={mediaFile} onRemoveImage={() => setMediaFile(undefined)} />
        <button type="button" onClick={handlePublishToFacebook} disabled={!postContent.trim() || publishing || published} className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(24,119,242,.22)] transition hover:-translate-y-0.5 hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
          {publishing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-black leading-none text-[#1877F2]" aria-hidden="true">f</span>}
          {publishing ? "Publishing to Fanpage..." : published ? "Published ✓" : "Publish to Facebook"}
        </button>
        {publishError && <p role="alert" className="rounded-xl border border-[#f3c2b8] bg-[#fff0ec] px-4 py-3 text-xs font-bold leading-relaxed text-[#a74331]">{publishError}</p>}
      </section>
    </div>
    {showSuccessToast && <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-[#bce4c5] bg-white px-4 py-3 text-sm font-bold text-[#28733f] shadow-[0_16px_40px_rgba(22,37,34,.16)]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e7f6e9]">✓</span>Post successfully published to Facebook Page!</div>}
  </div>;
}
