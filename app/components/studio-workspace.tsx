"use client";

import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Images,
  LayoutGrid,
  Lightbulb,
  Settings,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "../../context/SessionContext";
import type { Post } from "../lib/posts-store";
import AnalyticsDashboard from "./analytics-dashboard";
import ClubLogo from "./club-logo";
import ContentCalendar from "./content-calendar";
import Generator from "./generator";
import IdeaGenerator from "./idea-generator";
import MediaLibrary from "./media-library";
import NotificationBell from "./notification-bell";
import UserBadge from "./user-badge";
import ChatWidget from "./chat-widget";
import ActivityFeed from "./activity-feed";
import { FadeSlide } from "./fx/motion";
import SettingsPanel from "./settings-panel";

type Tab = "studio" | "ideas" | "calendar" | "media" | "analytics" | "settings";

const tabs: {
  id: Tab;
  label: string;
  icon: typeof LayoutGrid;
  adminOnly?: boolean;
}[] = [
  { id: "studio", label: "Studio", icon: LayoutGrid },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "media", label: "Thư viện", icon: Images },
  { id: "analytics", label: "Thống kê", icon: BarChart3 },
  { id: "settings", label: "Cài đặt", icon: Settings, adminOnly: true },
];

export default function StudioWorkspace() {
  const { role } = useSession();
  const [tab, setTab] = useState<Tab>("studio");
  const [pageUrl, setPageUrl] = useState<string | null>(null);

  // "View live site" → the connected Facebook Page.
  useEffect(() => {
    fetch("/api/page")
      .then((res) => res.json())
      .then((data) => {
        if (data?.url) setPageUrl(data.url);
      })
      .catch(() => {});
  }, []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [publishingDue, setPublishingDue] = useState(false);

  const loadPosts = useCallback(async (selectId?: string): Promise<Post[]> => {
    const response = await fetch("/api/posts");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load posts.");
    const list: Post[] = data.posts ?? [];
    setPosts(list);
    const target = list.find((post) => post.id === selectId) ?? list[0];
    setActiveId(target ? target.id : null);
    return list;
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- intentional initial data load */
    loadPosts()
      .catch((err: unknown) =>
        setLoadError(
          err instanceof Error ? err.message : "Could not load posts.",
        ),
      )
      .finally(() => setPostsLoading(false));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadPosts]);

  async function handleDraftCreated(post: Post) {
    setPosts((prev) => [post, ...prev]);
    setActiveId(post.id);
    setTab("studio");
  }

  function handleSelectPost(id: string) {
    setActiveId(id);
    setTab("studio");
  }

  async function handlePublishDue() {
    if (publishingDue) return;
    setPublishingDue(true);
    try {
      const response = await fetch("/api/publish-due", { method: "POST" });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not publish due posts.");
      await loadPosts(activeId ?? undefined);
    } finally {
      setPublishingDue(false);
    }
  }

  const nowIso = new Date().toISOString();
  const dueCount = posts.filter(
    (post) =>
      post.status === "Approved" &&
      !post.publishedAt &&
      post.scheduledAt &&
      post.scheduledAt <= nowIso,
  ).length;

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="flex border-b border-[var(--line)] bg-[#0c0f16]/85 px-5 py-5 backdrop-blur-xl lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <ClubLogo />
        <nav className="ml-auto grid grid-cols-6 gap-1 lg:ml-0 lg:mt-10 lg:block lg:space-y-1">
          {tabs
            .filter((t) => !t.adminOnly || role === "admin")
            .map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold lg:justify-start ${tab === id ? "bg-[rgba(139,92,246,.16)] text-[var(--ink)] shadow-[inset_0_0_0_1px_rgba(139,92,246,.35)]" : "text-[var(--muted)] hover:bg-white/[0.06] hover:text-[var(--ink)]"}`}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
        </nav>
        <div className="mt-auto hidden border-t border-[var(--line)] pt-5 lg:block">
          <p className="mt-8 flex items-center gap-2 px-3 font-mono text-[10px] uppercase tracking-[.15em] text-[var(--faint)]">
            © {new Date().getFullYear()} · Media — Ban Công Nghệ
          </p>
        </div>
      </aside>
      <section className="studio-canvas min-h-screen px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <header className="mb-8 flex items-end justify-between gap-5 entrance">
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[.2em] text-[var(--accent-2)]">
                {tab === "studio"
                  ? "Create & collaborate"
                  : tab === "ideas"
                    ? "AI brainstorming"
                    : tab === "calendar"
                      ? "Schedule & auto-publish"
                      : tab === "media"
                        ? "Shared assets"
                        : tab === "analytics"
                          ? "Performance"
                          : "Configuration"}{" "}
                / Media Desk
              </p>
              <h1 className="text-3xl font-black tracking-[-.06em] sm:text-5xl">
                {tab === "studio"
                  ? "Content, with intention."
                  : tab === "ideas"
                    ? "Ideas, on demand."
                    : tab === "calendar"
                      ? "Timing is everything."
                      : tab === "media"
                        ? "One library, every post."
                        : tab === "analytics"
                          ? "Know what works."
                          : "Keys, in one place."}
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {tab === "studio"
                  ? "Write, design, discuss and approve your next club story in one focused workspace."
                  : tab === "ideas"
                    ? "Let Gemini brainstorm around the club's event calendar, then turn an idea into a draft."
                    : tab === "calendar"
                      ? "See what's scheduled, spot the gaps, and let approved posts publish themselves."
                      : tab === "media"
                        ? "Upload once, reuse everywhere — the team's shared image collection."
                        : tab === "analytics"
                          ? "Real Facebook numbers: which posts hit, and when to post next."
                          : "Paste API keys once for the whole team — no redeploy needed."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell onSelectPost={handleSelectPost} />
              {pageUrl ? (
                <a
                  href={pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)]/80 px-4 py-2.5 text-xs font-extrabold shadow-sm backdrop-blur sm:flex"
                >
                  View live site <ArrowUpRight size={14} />
                </a>
              ) : (
                <span
                  className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)]/80 px-4 py-2.5 text-xs font-extrabold text-[var(--muted)] shadow-sm backdrop-blur sm:flex"
                  title="Admin chưa cấu hình Facebook Page ID"
                >
                  View live site <ArrowUpRight size={14} />
                </span>
              )}
              <UserBadge />
            </div>
          </header>

          {loadError && (
            <p className="mb-6 rounded-xl bg-[#2b1a1e] px-4 py-3 text-xs font-bold text-[#f0957e]">
              {loadError}
            </p>
          )}

          <ActivityFeed posts={posts} onSelectPost={handleSelectPost} />

          <FadeSlide key={tab} k={tab}>
          {tab === "studio" && (
            <Generator
              posts={posts}
              setPosts={setPosts}
              activeId={activeId}
              setActiveId={setActiveId}
              postsLoading={postsLoading}
              loadPosts={loadPosts}
            />
          )}
          {tab === "ideas" && (
            <IdeaGenerator
              canCreate={role === "content"}
              onDraftCreated={handleDraftCreated}
            />
          )}
          {tab === "calendar" && (
            <ContentCalendar
              posts={posts}
              role={role}
              dueCount={dueCount}
              onSelectPost={handleSelectPost}
              onPublishDue={handlePublishDue}
              publishingDue={publishingDue}
            />
          )}
          {tab === "media" && <MediaLibrary />}
          {tab === "analytics" && <AnalyticsDashboard />}
          {tab === "settings" && role === "admin" && <SettingsPanel />}
          </FadeSlide>
        </div>
      </section>
      <ChatWidget />
    </main>
  );
}
