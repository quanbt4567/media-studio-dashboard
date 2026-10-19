"use client";

import { BarChart3, CalendarCheck, CalendarClock, Clipboard, ClipboardList, Crown, Eye, FileText, Image as ImageIcon, Library, Lightbulb, LoaderCircle, Palette, Pin, Plus, Rocket, Sparkles, Trash2, Undo2, WandSparkles, Zap, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAllowedTransitions, useSession } from "../../context/SessionContext";
import type { Post } from "../lib/posts-store";
import FacebookPostBox from "./facebook-post-box";
import FacebookPreview from "./facebook-preview";
import MediaLibrary from "./media-library";
import PostStatusSwitcher, { PostStatus } from "./post-status-switcher";
import ReviewPanel from "./review-panel";
import TemplateStudio from "./template-studio";
import UserBadge from "./user-badge";

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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

interface PostPatch {
  content?: string;
  status?: PostStatus;
  imageDataUrl?: string;
  imageName?: string;
  clearImage?: boolean;
  videoUrl?: string;
  videoName?: string;
  clearVideo?: boolean;
  visualSkipped?: boolean;
  scheduledAt?: string;
  clearScheduledAt?: boolean;
}

function snippet(content: string): string {
  const clean = content.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, 42) + (clean.length > 42 ? "…" : "") : "Untitled draft";
}

/** Convert an ISO datetime to a datetime-local input value. */
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Generator({
  posts,
  setPosts,
  activeId,
  setActiveId,
  postsLoading,
  loadPosts,
}: {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  postsLoading: boolean;
  loadPosts: (selectId?: string) => Promise<Post[]>;
}) {
  const { role, permissions, user } = useSession();
  const [topic, setTopic] = useState("");
  const [postContent, setPostContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File>();
  const [ticketImage, setTicketImage] = useState<string>();
  const [ticketVideo, setTicketVideo] = useState<string>();
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  /** Optional note the writer attaches when handing a post off. */
  const [handoffNote, setHandoffNote] = useState("");
  /** AI visual brief for the designer (image idea + suggested template). */
  const [visualBrief, setVisualBrief] = useState<{ imageBrief: string; templateId: string; templateReason: string } | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  /** Saved post formats (mẫu bài viết), writer only. */
  const [formats, setFormats] = useState<{ id: string; name: string; content: string; createdBy: string; useCount: number }[]>([]);
  const [showFormats, setShowFormats] = useState(false);
  /** Library search + status filter. */
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PostStatus | "returned" | null>(null);
  /** Page's golden hour (for the schedule hint), admin only. */
  const [bestHour, setBestHour] = useState<number | null>(null);
  const [ticketMeta, setTicketMeta] = useState("");
  const [scheduledInput, setScheduledInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<PostStatus>("Draft");
  const [publishing, setPublishing] = useState(false);
  const [publishingDue, setPublishingDue] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [scoreResult, setScoreResult] = useState<{ score: number; breakdown: { criterion: string; points: number; max: number; comment: string }[]; suggestions: string[] } | null>(null);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);

  const activePost = posts.find((post) => post.id === activeId) ?? null;
  const allowedStatuses = getAllowedTransitions(role, status);
  const previewImage = mediaFile ?? ticketImage;
  /** The post counts as illustrated when it has an image or a video. */
  const hasVisual = Boolean(previewImage || ticketVideo);
  const isPublished = status === "Published";

  // Golden hour for the schedule hint (admin only) — best-effort.
  useEffect(() => {
    if (role !== "admin") return;
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((data) => { if (typeof data?.bestHour === "number") setBestHour(data.bestHour); })
      .catch(() => {});
  }, [role]);

  const applyPost = useCallback((post: Post) => {
    setPostContent(post.content || "");
    setStatus(post.status);
    setMediaFile(undefined);
    setTicketImage(post.imageDataUrl || undefined);
    setTicketVideo(post.videoUrl || undefined);
    setScheduledInput(toLocalInput(post.scheduledAt));
    setPublishError("");
    setTicketMeta(post.updatedBy ? `Last updated by ${post.updatedBy}` : "");
  }, []);

  // Apply the active post whenever the selection changes (not on every list refresh,
  // so external updates don't wipe local UI state like the publish confirmation).
  const appliedIdRef = useRef<string | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- intentional selection sync on activeId change */
  useEffect(() => {
    if (activeId === appliedIdRef.current) return;    appliedIdRef.current = activeId;
    const post = posts.find((p) => p.id === activeId);
    if (post) {
      applyPost(post);
    } else {
      setPostContent("");
      setStatus("Draft");
      setMediaFile(undefined);
      setTicketImage(undefined);
      setScheduledInput("");
      setTicketMeta("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /** Sync local editor state after an external update (review panel, etc.). */
  function handlePostUpdated(updated: Post) {
    setPosts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setPostContent(updated.content || "");
    setStatus(updated.status);
    setMediaFile(undefined);
    setTicketImage(updated.imageDataUrl || undefined);
    setScheduledInput(toLocalInput(updated.scheduledAt));
    setTicketMeta(updated.updatedBy ? `Last updated by ${updated.updatedBy}` : "");
  }

  async function createNewPost() {
    setError("");
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create post.");
      const post: Post = data.post;
      setPosts((prev) => [post, ...prev]);
      setActiveId(post.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create post.");
    }
  }

  async function deleteActivePost() {
    if (!activePost) return;
    if (!window.confirm("Delete this post permanently?")) return;
    try {
      const response = await fetch(`/api/posts/${activePost.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete post.");
      const remaining = posts.filter((post) => post.id !== activePost.id);
      setPosts(remaining);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete post.");
    }
  }

  async function savePost(patch: PostPatch) {
    if (!activeId) return null;
    setSaving(true);
    try {
      const response = await fetch(`/api/posts/${activeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the post.");
      const post: Post = data.post;
      setPosts((prev) => prev.map((item) => (item.id === post.id ? post : item)));
      setTicketMeta(post.updatedBy ? `Last updated by ${post.updatedBy}` : "");
      return post;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the post.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function generatePost() {
    if (!activeId) {
      setError("Hãy tạo bài viết trước.");
      return;
    }
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
      setShowSuccessToast(false);
      setPublishError("");
      await savePost({ content: data.content, status: "Draft" });
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  async function copyPost() { if (!postContent) return; await navigator.clipboard.writeText(postContent); setCopied(true); setTimeout(() => setCopied(false), 1800); }

  /** Post a comment as the current user (used for handoff notes). */
  async function postHandoffComment(postId: string, text: string) {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (response.ok && data.post) {
        setPosts((prev) => prev.map((item) => (item.id === data.post.id ? data.post : item)));
        if (data.post.id === activeId) handlePostUpdated(data.post);
      }
    } catch (commentError) {
      console.warn("Could not post handoff note:", commentError);
    }
  }

  /** Built-in template id → display name (mirrors template-studio). */
  function templateName(id: string): string {
    return (
      {
        "bcn-announce": "Thông báo",
        "bcn-event": "Sự kiện",
        "bcn-recap": "Recap",
        "bcn-recruit": "Tuyển thành viên",
        "bcn-quote": "Trích dẫn",
        "bcn-modern": "Hiện đại",
      } as Record<string, string>
    )[id] ?? id;
  }

  /** Ask AI for a visual brief (image idea + best template) for the designer. */
  async function fetchVisualBrief() {    if (!postContent.trim() || briefLoading) return;
    setBriefLoading(true);
    try {
      const res = await fetch("/api/visual-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI gợi ý thất bại.");
      setVisualBrief(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI gợi ý thất bại.");
    } finally {
      setBriefLoading(false);
    }
  }

  /** Writer → designer: needs a visual. Clears any fast-lane exemption. */
  async function handleSendToDesigner() {
    const note = handoffNote.trim();
    setPostContent(postContent);
    setStatus("Waiting Media");
    const saved = await savePost({
      content: postContent,
      status: "Waiting Media",
      visualSkipped: false,
      ...(visualBrief
        ? {
            visualBrief: visualBrief.imageBrief,
            suggestedTemplateId: visualBrief.templateId,
            suggestedTemplateReason: visualBrief.templateReason,
          }
        : {}),
    });
    if (!saved) return;
    if (note) await postHandoffComment(saved.id, `→ Nhắn designer: ${note}`);
    if (visualBrief) {
      await postHandoffComment(
        saved.id,
        `→ AI gợi ý visual: ${visualBrief.imageBrief} (Mẫu gợi ý: ${templateName(visualBrief.templateId)} — ${visualBrief.templateReason})`,
      );
    }
    setHandoffNote("");
    setVisualBrief(null);
  }

  /** Writer → admin directly: text-only fast lane, skips the designer. */
  async function handleSendToAdmin() {
    const note = handoffNote.trim();
    setPostContent(postContent);
    setStatus("Review Pending");
    const saved = await savePost({ content: postContent, status: "Review Pending", visualSkipped: true });
    if (!saved) return;
    if (note) await postHandoffComment(saved.id, `→ Nhắn admin: ${note}`);
    setHandoffNote("");
  }

  /** Load saved formats for the writer's template picker. */
  async function loadFormats() {
    try {
      const response = await fetch("/api/formats");
      const data = await response.json();
      if (response.ok) setFormats(data.formats || []);
    } catch (formatError) {
      console.warn("Could not load formats:", formatError);
    }
  }

  /** Start a new draft from a saved format. */
  async function useFormat(id: string) {
    try {
      const response = await fetch(`/api/formats/${id}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not use format.");
      setPosts((prev) => [data.post, ...prev]);
      setActiveId(data.post.id);
      setShowFormats(false);
      loadFormats();
    } catch (formatError) {
      setError(formatError instanceof Error ? formatError.message : "Could not use format.");
    }
  }

  /** Delete a saved format. */
  async function deleteFormat(id: string) {
    try {
      const response = await fetch(`/api/formats/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error || "Could not delete format.");
      setFormats((prev) => prev.filter((f) => f.id !== id));
    } catch (formatError) {
      setError(formatError instanceof Error ? formatError.message : "Could not delete format.");
    }
  }

  /** Duplicate a post into a fresh draft (writer only). */
  async function duplicatePost(id: string) {
    try {
      const response = await fetch(`/api/posts/${id}/duplicate`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not duplicate post.");
      setPosts((prev) => [data.post, ...prev]);
      setActiveId(data.post.id);
    } catch (dupError) {
      setError(dupError instanceof Error ? dupError.message : "Could not duplicate post.");
    }
  }

  /** "Việc của tôi" — actionable items for the current role. */
  type WorkItem = { key: PostStatus | "returned"; label: string; count: number; icon: LucideIcon };
  const myWork: WorkItem[] = ((): WorkItem[] => {
    const rejected = (p: Post) => p.review?.decision === "rejected";
    const items: WorkItem[] = [];
    if (role === "content") {
      const drafts = posts.filter((p) => p.status === "Draft");
      items.push(
        { key: "Draft", label: "Nháp của bạn", icon: FileText, count: drafts.filter((p) => !rejected(p)).length },
        { key: "returned", label: "Bị trả về", icon: Undo2, count: drafts.filter(rejected).length },
      );
    } else if (role === "media") {
      const waiting = posts.filter((p) => p.status === "Waiting Media");
      items.push(
        { key: "Waiting Media", label: "Chờ bạn gắn ảnh", icon: ImageIcon, count: waiting.filter((p) => !rejected(p)).length },
        { key: "returned", label: "Bị trả về", icon: Undo2, count: waiting.filter(rejected).length },
      );
    } else if (role === "admin") {
      items.push(
        { key: "Review Pending", label: "Chờ bạn duyệt", icon: Eye, count: posts.filter((p) => p.status === "Review Pending").length },
        { key: "Approved", label: "Đã duyệt, chờ đăng", icon: CalendarCheck, count: posts.filter((p) => p.status === "Approved" && !p.publishedAt).length },
      );
    }
    return items.filter((w) => w.count > 0);
  })();

  /** Posts visible in the library grid after search + filter. */
  const visiblePosts = posts.filter((post) => {
    if (statusFilter === "returned" && post.review?.decision !== "rejected") return false;
    if (statusFilter && statusFilter !== "returned" && post.status !== statusFilter) return false;
    if (searchQuery.trim() && !post.content.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
    return true;
  });

  async function handleStatusChange(next: PostStatus) {
    if (!getAllowedTransitions(role, status).includes(next)) return;
    setStatus(next);
    await savePost({ status: next });
  }

  /** Designer hands the illustrated post to the admin for review. */
  async function handleSendToReview() {
    if (!hasVisual) {
      setError("Gắn hình ảnh hoặc video trước khi gửi duyệt.");
      return;
    }
    const saved = await savePost({ status: "Review Pending" });
    if (saved) setStatus("Review Pending");
  }

  const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

  /** Designer uploads a video straight to Vercel Blob (bypasses the 4.5 MB API body limit). */
  async function handleVideoSelect(file: File) {
    if (!file.type.startsWith("video/")) {
      setError("Chỉ chấp nhận file video (mp4, mov, webm).");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("Video quá lớn (tối đa 100 MB).");
      return;
    }
    setError("");
    setUploadingVideo(true);
    setVideoProgress(0);
    try {
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/token",
        onUploadProgress: (event) => setVideoProgress(Math.round(event.percentage)),
      });
      const saved = await savePost({ videoUrl: blob.url, videoName: file.name });
      if (!saved) return; // Error already shown — don't display a video that isn't saved.
      setTicketVideo(saved.videoUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload video thất bại.");
    } finally {
      setUploadingVideo(false);
      setVideoProgress(null);
    }
  }

  async function handleRemoveVideo() {
    const saved = await savePost({ clearVideo: true });
    if (!saved) return;
    setTicketVideo(undefined);
  }

  async function handleScheduleChange(value: string) {
    setScheduledInput(value);
    if (!activeId) return;
    if (!value) {
      await savePost({ clearScheduledAt: true });
    } else {
      const when = new Date(value);
      if (Number.isNaN(when.getTime())) {
        setError("Invalid date.");
        return;
      }
      await savePost({ scheduledAt: when.toISOString() });
    }
  }

  async function handleImageSelect(file?: File) {
    setMediaFile(file);
    if (!file) {
      const saved = await savePost({ clearImage: true });
      if (saved) setTicketImage(undefined);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image is too large (max 5 MB).");
      setMediaFile(undefined);
      return;
    }
    setError("");
    try {
      const dataUrl = await fileToDataUrl(file);
      const saved = await savePost({ imageDataUrl: dataUrl, imageName: file.name });
      if (!saved) {
        // Save failed (error already shown) — don't display an image that isn't saved.
        setMediaFile(undefined);
        return;
      }
      setTicketImage(saved.imageDataUrl);
      // Everything uploaded from the device also goes into the shared library.
      fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, dataUrl }),
      }).catch((err) => console.warn("Could not save upload to library:", err));
    } catch (imageError) {
      setMediaFile(undefined);
      setError(imageError instanceof Error ? imageError.message : "Could not process the image.");
    }
  }

  async function handleRemoveImage() {
    const saved = await savePost({ clearImage: true });
    if (!saved) return;
    setMediaFile(undefined);
    setTicketImage(undefined);
  }

  async function handleStudioSave(dataUrl: string) {
    const saved = await savePost({ imageDataUrl: dataUrl, imageName: `studio-${Date.now()}.jpg` });
    if (!saved) return; // Error already shown — don't display an image that isn't saved.
    setMediaFile(undefined);
    setTicketImage(saved.imageDataUrl);
  }

  /** Attach an image from the shared library to the active post. */
  async function attachLibraryImage(item: { dataUrl: string; name: string }) {
    const saved = await savePost({ imageDataUrl: item.dataUrl, imageName: item.name });
    if (!saved) return;
    setMediaFile(undefined);
    setTicketImage(saved.imageDataUrl);
    setShowLibraryPicker(false);
  }

  /** Ask Gemini to grade the current draft. */
  async function handleScore() {
    if (!postContent.trim() || scoring) return;
    setScoring(true);
    setScoreError("");
    setScoreResult(null);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scoring failed.");
      setScoreResult(data);
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : "Scoring failed.");
    } finally {
      setScoring(false);
    }
  }

  async function handlePublishToFacebook() {
    if (!activeId || !postContent.trim() || publishing || isPublished) return;

    setPublishing(true);
    setError("");
    setPublishError("");
    try {
      const response = await fetch(`/api/posts/${activeId}/publish`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The post could not be published.");

      const updated: Post = data.post;
      setPosts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setStatus("Published");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3500);
    } catch (publishError) {
      setPublishError(publishError instanceof Error ? publishError.message : "The post could not be published.");
    } finally {
      setPublishing(false);
    }
  }

  async function handlePublishDue() {
    if (publishingDue) return;
    setPublishingDue(true);
    setError("");
    try {
      const response = await fetch("/api/publish-due", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish due posts.");
      if (data.failed?.length) {
        setError(`Published ${data.published.length}, failed ${data.failed.length}: ${data.failed[0].error}`);
      }
      await loadPosts(activeId ?? undefined);
    } catch (dueError) {
      setError(dueError instanceof Error ? dueError.message : "Could not publish due posts.");
    } finally {
      setPublishingDue(false);
    }
  }

  const canDelete = activePost && activePost.status !== "Published" && (role === "admin" || (activePost.createdBy === user.username && activePost.status === "Draft"));
  const canSchedule = role === "admin" && status !== "Published";
  const nowIso = new Date().toISOString();
  const duePosts = posts.filter(
    (post) => post.status === "Approved" && !post.publishedAt && post.scheduledAt && post.scheduledAt <= nowIso,
  );

  return <div className="rounded-[28px] border border-white/75 bg-white/70 p-4 shadow-[0_24px_80px_rgba(22,37,34,.12)] backdrop-blur-2xl sm:p-7 entrance" style={{ animationDelay: "180ms" }}>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><div className="mb-2 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--lime)]"><Sparkles size={14} /></span><span className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[var(--muted)]">Studio assistant</span></div><h2 className="text-2xl font-black tracking-[-.05em]">Make something people feel.</h2><p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--muted)]">Turn a rough idea into a Facebook-ready post in seconds.</p></div><span className="rounded-full bg-[#eef1e8] px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">AI powered</span></div>
    <div className="mb-6"><UserBadge /></div>

    {/* Due posts banner */}
    {role === "admin" && duePosts.length > 0 && (
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#f3c2b8] bg-[#fff0ec] px-4 py-3">
        <p className="text-xs font-extrabold text-[#a74331]">⏰ {duePosts.length} approved post{duePosts.length === 1 ? "" : "s"} past {duePosts.length === 1 ? "its" : "their"} scheduled time</p>
        <button type="button" onClick={handlePublishDue} disabled={publishingDue} className="ml-auto flex items-center gap-1.5 rounded-xl bg-[#1877F2] px-4 py-2 text-xs font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-50"><Rocket size={13} /> {publishingDue ? "Publishing…" : "Publish due now"}</button>
      </div>
    )}

    {/* Post library — wrapping grid, no horizontal scroll */}
    <section aria-label="Thư viện bài viết" className="mb-8">
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">Thư viện bài viết · {posts.length} post{posts.length === 1 ? "" : "s"}</h2>

      {/* "Việc của tôi" — role work queue */}
      {myWork.length > 0 && (
        <div className="mb-3 rounded-2xl border border-[var(--ink)] bg-white p-3 shadow-[0_8px_24px_rgba(22,37,34,.08)]">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold"><Pin size={13} /> Việc của bạn</p>
          <div className="flex flex-wrap gap-1.5">
            {myWork.map((w) => (
              <button
                key={w.key}
                type="button"
                onClick={() => setStatusFilter((f) => (f === w.key ? null : w.key))}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition ${statusFilter === w.key ? "bg-[var(--ink)] text-white" : "bg-[#f2f4ec] text-[var(--ink)] hover:bg-[#e7ecdd]"}`}
              >
                <w.icon size={12} /> {w.label} · {w.count}
              </button>
            ))}
            {statusFilter && (
              <button type="button" onClick={() => { setStatusFilter(null); setSearchQuery(""); }} className="rounded-full px-3 py-1.5 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--ink)]">
                ✕ Xóa lọc
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm trong nội dung bài viết..."
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-xs outline-none placeholder:text-[#a8b0a7] focus:border-[var(--ink)] sm:max-w-xs"
        />
      </div>
      {postsLoading ? <p className="py-4 text-center text-xs text-[var(--muted)]">Đang tải bài viết...</p> : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-[#fafbf7] px-4 py-6 text-center">
          <p className="text-xs text-[var(--muted)]">
            {role === "content" ? "Chưa có bài viết nào." : "Chưa có bài nào — đang chờ team nội dung tạo bản nháp đầu tiên."}
          </p>
          {role === "content" && (
            <button
              type="button"
              onClick={createNewPost}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--ink)] px-4 py-2 text-xs font-extrabold text-white transition hover:opacity-90"
            >
              <Plus size={14} /> Bài mới
            </button>
          )}
        </div>
      ) : visiblePosts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--line)] bg-[#fafbf7] px-4 py-6 text-center text-xs text-[var(--muted)]">
          Không tìm thấy bài nào khớp. <button type="button" onClick={() => { setStatusFilter(null); setSearchQuery(""); }} className="font-extrabold text-[var(--ink)] underline">Xóa lọc</button>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {(role === "content") && (
            <button
              type="button"
              onClick={createNewPost}
              className="flex min-h-[108px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--line)] bg-white/40 p-3 text-[var(--muted)] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
            >
              <Plus size={18} />
              <span className="text-xs font-extrabold">Bài mới</span>
            </button>
          )}
          {visiblePosts.map((post) => {
            const active = post.id === activeId;
            return (
              <div key={post.id} className="relative">
              <button
                type="button"
                onClick={() => setActiveId(post.id)}
                className={`min-h-[108px] w-full rounded-xl border p-3 text-left transition ${active ? "border-[var(--ink)] bg-white shadow-[0_8px_24px_rgba(22,37,34,.12)]" : "border-[var(--line)] bg-white/50 hover:border-[var(--ink)]"}`}
              >
                <span className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold ${post.status === "Published" ? "bg-[#1877F2] text-white" : post.status === "Approved" ? "bg-[var(--lime)] text-[var(--ink)]" : post.status === "Draft" ? "bg-[#eef1e8] text-[var(--ink)]" : "bg-[#fff1d6] text-[#8b5d16]"}`}>{post.status}</span>
                <span className="block line-clamp-2 text-xs font-bold leading-snug">{snippet(post.content)}</span>
                <span className="mt-1 block truncate font-mono text-[9px] text-[var(--muted)]">{post.updatedBy} · {post.imageDataUrl ? "ảnh" : post.videoUrl ? "video" : "no image"}{post.scheduledAt ? ` · ◷ ${new Date(post.scheduledAt).toLocaleDateString()}` : ""}</span>
                {post.review?.decision === "rejected" && <span className="mb-1.5 ml-1 inline-block rounded-full bg-[#fff0ec] px-2 py-0.5 text-[9px] font-extrabold text-[#a74331]">↩ trả về</span>}
              </button>
              {role === "content" && (
                <button
                  type="button"
                  onClick={() => duplicatePost(post.id)}
                  title="Nhân bản thành draft mới"
                  className="absolute right-2 top-2 rounded-full border border-[var(--line)] bg-white/90 px-2 py-1 text-[10px] font-bold text-[var(--muted)] shadow-sm transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
                >
                  ⧉
                </button>
              )}
              </div>
            );
          })}
        </div>
      )}
    </section>

    {activePost && <>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <section aria-label="Composer" className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${saving ? "animate-pulse bg-[var(--orange)]" : "bg-[var(--lime)]"}`} />
              <h3 className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">Composer</h3>
              <div className="ml-auto flex items-center gap-2">
                {permissions.canUploadMedia && <button type="button" onClick={() => setShowLibraryPicker(true)} className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--muted)] hover:text-[var(--ink)]"><Library size={13} /> Thư viện ảnh</button>}
                {role === "content" && <button type="button" onClick={() => { loadFormats(); setShowFormats(true); }} className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--muted)] hover:text-[var(--ink)]"><ClipboardList size={13} /> Mẫu bài viết</button>}
                {postContent && <button onClick={copyPost} className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--muted)] hover:text-[var(--ink)]"><Clipboard size={13} />{copied ? "Đã chép" : "Sao chép bài"}</button>}
                {canDelete && <button type="button" onClick={deleteActivePost} className="flex items-center gap-1 rounded-full border border-[#f3c2b8] bg-[#fff0ec] px-2.5 py-1 text-[10px] font-extrabold text-[#a74331] hover:bg-[#ffe4dc]"><Trash2 size={11} /> Xóa</button>}
              </div>
            </div>
            <p className="mb-4 mt-1.5 font-mono text-[9px] uppercase tracking-[.15em] text-[var(--muted)]">
              {saving ? "Đang lưu..." : ticketMeta ? ticketMeta : "Bản nháp chung"}
            </p>
      {permissions.canGenerateAI ? <>
        <label className="mb-2 block text-xs font-extrabold" htmlFor="topic">Viết về chủ đề gì?</label><textarea suppressHydrationWarning id="topic" value={topic} maxLength={240} onChange={(event) => setTopic(event.target.value)} placeholder="VD: workshop làm gốm cho người mới vào thứ 6..." className="min-h-28 w-full resize-none rounded-xl border border-[var(--line)] bg-[#fafbf7] p-3 text-sm outline-none transition placeholder:text-[#a8b0a7] focus:border-[var(--ink)] focus:ring-2 focus:ring-[var(--lime)]" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-[10px] text-[var(--muted)]">{topic.length}/240 ký tự</p><button disabled={!topic.trim() || loading} onClick={generatePost} className="flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-xs font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#263b35] disabled:cursor-not-allowed disabled:opacity-40">{loading ? <LoaderCircle className="animate-spin" size={15} /> : <WandSparkles size={15} />} {loading ? "Đang viết..." : "Viết bằng AI"}</button></div>
      </> : <p className="rounded-xl border border-dashed border-[var(--line)] bg-[#fafbf7] px-4 py-3 text-xs leading-relaxed text-[var(--muted)]">{role === "admin" ? <><strong className="inline-flex items-center gap-1 text-[var(--ink)]"><Crown size={13} /> Admin mode</strong> — bạn chỉ duyệt và đăng bài. Viết bài là việc của writer, hình ảnh là việc của designer. Mở từng bài viết để xem preview, duyệt hoặc trả về.</> : <><strong className="inline-flex items-center gap-1 text-[var(--ink)]"><Palette size={13} /> Media Creator mode</strong> — the writer&apos;s draft loads automatically below (read-only for you). Attach visuals, then mark the post ready for review.</>}</p>}
      {error && <p className="mt-4 rounded-lg bg-[#fff0ec] px-3 py-2 text-xs font-bold text-[#b8543c]">{error}</p>}
            <div className="mt-5">
              <FacebookPostBox value={postContent} onChange={setPostContent} image={mediaFile} onImageChange={handleImageSelect} onBrowseLibrary={permissions.canUploadMedia && !isPublished ? () => setShowLibraryPicker(true) : undefined} onVideoSelect={permissions.canUploadMedia && !isPublished ? handleVideoSelect : undefined} videoUploading={uploadingVideo} userName={process.env.NEXT_PUBLIC_CLUB_NAME || "BCN"} placeholder="Bài AI viết sẽ hiện ở đây. Chỉnh sử trước khi gửi..." textReadOnly={!permissions.canEditText || isPublished} hideImageControls={!permissions.canUploadMedia || isPublished} hideSubmit />
              {uploadingVideo && (
                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                    <div className="h-full rounded-full bg-[var(--ink)] transition-all" style={{ width: `${videoProgress ?? 0}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">Đang tải video lên… {videoProgress ?? 0}%</p>
                </div>
              )}
              {/* Writer handoff: choose the designer lane or the text-only fast lane. */}
              {role === "content" && status === "Draft" && (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-[#fafbf7] p-3">
                  <input
                    value={handoffNote}
                    onChange={(event) => setHandoffNote(event.target.value)}
                    placeholder="Nhắn cho người nhận (không bắt buộc) — vd: cần poster tone vui nhộn"
                    className="mb-2.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs outline-none placeholder:text-[#a8b0a7] focus:border-[var(--ink)]"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={fetchVisualBrief}
                      disabled={briefLoading || !postContent.trim()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--ink)] bg-white px-4 py-2 text-xs font-extrabold text-[var(--ink)] transition hover:bg-[#f2f4ec] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {briefLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {briefLoading ? "AI đang nghĩ…" : "AI gợi ý visual cho designer"}
                    </button>
                  </div>
                  {visualBrief && (
                    <div className="mt-2 rounded-xl border border-[#bce4c5] bg-[#f2f9f3] p-3 text-left">
                      <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#28733f]">
                        <Sparkles size={12} /> Gợi ý cho designer
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--ink)]">{visualBrief.imageBrief}</p>
                      <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                        Mẫu phù hợp: <strong className="text-[var(--ink)]">{templateName(visualBrief.templateId)}</strong>
                        {visualBrief.templateReason ? ` — ${visualBrief.templateReason}` : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => setVisualBrief(null)}
                        className="mt-1 text-[11px] font-bold text-[var(--muted)] underline hover:text-[var(--ink)]"
                      >
                        Bỏ gợi ý này
                      </button>
                    </div>
                  )}
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleSendToDesigner}
                      disabled={saving || !postContent.trim()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-xs font-extrabold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Gửi cho designer →
                    </button>
                    <button
                      type="button"
                      onClick={handleSendToAdmin}
                      disabled={saving || !postContent.trim()}
                      title="Bài chỉ có chữ, không cần ảnh — gửi thẳng cho admin duyệt"
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--ink)] bg-white px-4 py-2.5 text-xs font-extrabold text-[var(--ink)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Zap size={14} /> Gửi thẳng cho admin
                    </button>
                  </div>
                  <p className="mt-1.5 text-center text-[11px] text-[var(--muted)]">Bài cần ảnh minh họa → gửi designer. Bài chỉ có chữ → gửi thẳng admin cho nhanh.</p>
                </div>
              )}
            </div>
          </section>
          {permissions.canEditText && !isPublished && (
            <section aria-label="AI score" className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]"><BarChart3 size={12} /> AI score</h3>
                <button
                  type="button"
                  onClick={handleScore}
                  disabled={!postContent.trim() || scoring}
                  className="rounded-full bg-[var(--ink)] px-4 py-1.5 text-xs font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-40"
                >
                  {scoring ? "Đang chấm..." : scoreResult ? "Chấm lại" : "Chấm điểm"}
                </button>
              </div>
              {scoreError && <p className="mt-2 text-xs font-bold text-[#b8543c]">{scoreError}</p>}
              {scoreResult && (
                <div className="mt-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white"
                      style={{ background: `conic-gradient(${scoreResult.score >= 80 ? "#28733f" : scoreResult.score >= 60 ? "#b8860b" : "#a74331"} ${scoreResult.score}%, #e5e7eb 0)` }}
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--ink)]">{scoreResult.score}</span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {scoreResult.score >= 80 ? "Bài viết tốt, sẵn sàng gửi duyệt!" : scoreResult.score >= 60 ? "Ổn rồi, sửa thêm vài chỗ bên dưới sẽ ngon hơn." : "Cần cải thiện nhiều — xem gợi ý bên dưới nhé."}
                    </p>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {scoreResult.breakdown.map((b, i) => (
                      <div key={i} className="text-xs">
                        <div className="flex justify-between font-bold"><span className="capitalize">{b.criterion}</span><span>{b.points}/{b.max}</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#e5e7eb]"><div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${b.max ? Math.round((b.points / b.max) * 100) : 0}%` }} /></div>
                        <p className="text-[11px] text-[var(--muted)]">{b.comment}</p>
                      </div>
                    ))}
                  </div>
                  {scoreResult.suggestions.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed">
                      {scoreResult.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </section>
          )}
          {canSchedule && (
            <section aria-label="Schedule" className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="schedule-at" className="flex shrink-0 items-center gap-1.5 text-xs font-extrabold"><CalendarClock size={13} /> Hẹn giờ đăng</label>
                <input
                  id="schedule-at"
                  type="datetime-local"
                  value={scheduledInput}
                  onChange={(e) => handleScheduleChange(e.target.value)}
                  className="min-w-[200px] flex-1 rounded-xl border border-[var(--line)] bg-[#fafbf7] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
                />
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
                {scheduledInput
                  ? "Bài đã duyệt sẽ tự đăng đúng giờ này (hoặc bấm “Đăng ngay bài đến hạn” ở trên)."
                  : "Chọn ngày & giờ — bài sẽ tự đăng khi đã được duyệt."}
                {bestHour !== null && <> <Lightbulb size={13} className="inline-block align-[-2px]" /> Giờ vàng của Page là <strong className="text-[var(--ink)]">{bestHour}:00</strong> — đăng lúc này tương tác cao nhất.</>}
              </p>
            </section>
          )}
        </div>
        <div className="min-w-0">
          <section aria-label="Facebook preview" className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">Preview</h3>
            <div className="space-y-4">
              <PostStatusSwitcher status={status} onChange={handleStatusChange} isStatusAllowed={(candidate) => allowedStatuses.includes(candidate)} />
              {role === "media" && status === "Waiting Media" && (
                <div>
                  <button
                    type="button"
                    onClick={handleSendToReview}
                    disabled={!hasVisual || saving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Đang gửi..." : "Gửi duyệt →"}
                  </button>
                  {!hasVisual && (
                    <p className="mt-1.5 text-center text-[11px] text-[var(--muted)]">Gắn hình ảnh hoặc video trước khi gửi duyệt.</p>
                  )}
                </div>
              )}
              <FacebookPreview generatedText={postContent} image={previewImage} video={ticketVideo} onRemoveImage={previewImage && permissions.canUploadMedia ? handleRemoveImage : undefined} onRemoveVideo={ticketVideo && permissions.canUploadMedia ? handleRemoveVideo : undefined} />
          {permissions.canPublish ? <>
            <button type="button" onClick={handlePublishToFacebook} disabled={!postContent.trim() || publishing || isPublished || status !== "Approved"} className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(24,119,242,.22)] transition hover:-translate-y-0.5 hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
              {publishing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-black leading-none text-[#1877F2]" aria-hidden="true">f</span>}
              {publishing ? "Publishing to Fanpage..." : isPublished ? "Published ✓" : "Publish to Facebook"}
            </button>
            {status !== "Approved" && !isPublished && <p className="text-center text-[11px] text-[var(--muted)]">Publishing unlocks once the post is approved.</p>}
            {publishError && <p role="alert" className="rounded-xl border border-[#f3c2b8] bg-[#fff0ec] px-4 py-3 text-xs font-bold leading-relaxed text-[#a74331]">{publishError}</p>}
          </> : <p className="rounded-xl bg-[#eef1e8] px-4 py-3 text-center text-[11px] font-bold text-[var(--muted)]"><Crown size={12} className="mr-1 inline-block align-[-2px]" /> Publishing to Facebook is restricted to the Admin / Leader role.</p>}
            </div>
          </section>
        </div>
      </div>
      <div className="mt-5">
        <ReviewPanel post={activePost} role={role} onPostUpdated={handlePostUpdated} />
      </div>
      {permissions.canUploadMedia && !isPublished && (
        <div className="mt-5">
          <TemplateStudio
            postContent={postContent}
            postImage={ticketImage}
            canDesign={permissions.canUploadMedia}
            onSave={handleStudioSave}
            suggestedTemplateId={activePost.suggestedTemplateId}
            visualBrief={activePost.visualBrief}
          />
        </div>
      )}
    </>}
    {showLibraryPicker && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowLibraryPicker(false)}>
        <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-extrabold"><Library size={18} /> Thư viện ảnh dùng chung</h3>
            <button type="button" onClick={() => setShowLibraryPicker(false)} className="rounded-full border border-[var(--line)] px-3 py-1 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">Đóng</button>
          </div>
          <MediaLibrary onPick={attachLibraryImage} />
        </div>
      </div>
    )}
    {showFormats && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowFormats(false)}>
        <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-extrabold"><ClipboardList size={18} /> Mẫu bài viết</h3>
            <button type="button" onClick={() => setShowFormats(false)} className="rounded-full border border-[var(--line)] px-3 py-1 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">Đóng</button>
          </div>
          <p className="mb-4 text-xs text-[var(--muted)]">Format được tự động lưu mỗi khi bạn gửi bài khỏi Draft. Bấm “Dùng” để tạo draft mới từ mẫu.</p>
          {formats.length === 0 ? (
            <p className="rounded-xl bg-[#fafbf7] px-4 py-8 text-center text-xs text-[var(--muted)]">Chưa có mẫu nào. Gửi bài đầu tiên đi, format sẽ tự lưu ở đây.</p>
          ) : (
            <div className="space-y-2.5">
              {formats.map((format) => (
                <div key={format.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[#fafbf7] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold">{format.name}</p>
                    <p className="truncate text-[11px] text-[var(--muted)]">
                      {format.content.replace(/\s+/g, " ").slice(0, 80)} · bởi {format.createdBy}{format.useCount > 0 ? ` · đã dùng ${format.useCount} lần` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => useFormat(format.id)}
                    className="shrink-0 rounded-xl bg-[var(--ink)] px-3.5 py-2 text-xs font-extrabold text-white transition hover:-translate-y-0.5"
                  >
                    Dùng
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFormat(format.id)}
                    title="Xóa mẫu này"
                    className="shrink-0 rounded-xl border border-[#f3c2b8] bg-white px-2.5 py-2 text-xs font-bold text-[#a74331] hover:bg-[#fff0ec]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    {showSuccessToast && <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-[#bce4c5] bg-white px-4 py-3 text-sm font-bold text-[#28733f] shadow-[0_16px_40px_rgba(22,37,34,.16)]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e7f6e9]">✓</span>Post successfully published to Facebook Page!</div>}
  </div>;
}
