import { NextResponse } from "next/server";
import { readPosts, updatePost } from "@/app/lib/posts-store";
import { getSessionUser } from "@/app/lib/session";
import { resolveApiKey } from "@/app/lib/settings-store";

export const dynamic = "force-dynamic";

interface PostStats {
  id: string;
  snippet: string;
  publishedAt?: string;
  facebookPostId?: string;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  metricsUpdatedAt?: string;
}

async function fetchPostStats(fbPostId: string, token: string): Promise<{ stats: { likes: number; comments: number; shares: number } | null; error?: string }> {
  try {
    // Note: the `shares` field no longer exists on PagePost in recent Graph API
    // versions (removed) — requesting it fails the whole call with (#100).
    // Shares default to 0; likes + comments remain accurate.
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(fbPostId)}?fields=likes.summary(true),comments.summary(true)&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const errBody = (await res.json()) as { error?: { message?: string; code?: number } };
        if (errBody?.error?.message) detail += ` — ${errBody.error.message}`;
      } catch { /* ignore parse errors */ }
      return { stats: null, error: detail };
    }
    const data = (await res.json()) as {
      likes?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
    };
    return {
      stats: {
        likes: data.likes?.summary?.total_count ?? 0,
        comments: data.comments?.summary?.total_count ?? 0,
        shares: 0,
      },
    };
  } catch (err) {
    return { stats: null, error: err instanceof Error ? err.message : "Network error" };
  }
}

interface PagePostStats {
  id: string;
  snippet: string;
  createdAt?: string;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  picture?: string;
}

async function fetchPageInfo(pageId: string, token: string): Promise<{ name: string; followers: number; fanCount: number } | null> {
  try {
    const params = new URLSearchParams({ fields: "name,followers_count,fan_count", access_token: token });
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string; followers_count?: number; fan_count?: number };
    return {
      name: data.name ?? "Fanpage",
      followers: data.followers_count ?? 0,
      fanCount: data.fan_count ?? 0,
    };
  } catch {
    return null;
  }
}

async function fetchPagePosts(pageId: string, token: string): Promise<PagePostStats[]> {
  try {
    const fields = "id,message,created_time,likes.summary(true),comments.summary(true),shares,full_picture";
    const params = new URLSearchParams({ fields, limit: "20", access_token: token });
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}/posts?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data?: {
        id?: string;
        message?: string;
        created_time?: string;
        likes?: { summary?: { total_count?: number } };
        comments?: { summary?: { total_count?: number } };
        shares?: { count?: number };
        full_picture?: string;
      }[];
    };
    return (data.data ?? []).map((p) => {
      const likes = p.likes?.summary?.total_count ?? 0;
      const comments = p.comments?.summary?.total_count ?? 0;
      const shares = p.shares?.count ?? 0;
      return {
        id: p.id ?? "",
        snippet: (p.message ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || "Untitled",
        createdAt: p.created_time,
        likes,
        comments,
        shares,
        engagement: likes + comments * 2 + shares * 3,
        picture: p.full_picture,
      };
    });
  } catch {
    return [];
  }
}

/**
 * GET /api/analytics — engagement stats for published posts.
 * Pulls likes/comments/shares from Facebook for posts with a facebookPostId,
 * caches them on the post record, and returns the ranking.
 * Also returns Page-level info (followers, recent Page posts) when the
 * Page credentials are configured.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const token = await resolveApiKey("fbPageAccessToken");
  const pageId = await resolveApiKey("fbPageId");
  const posts = await readPosts();
  const published = posts.filter((p) => p.status === "Published");

  const stats: PostStats[] = [];
  const statsErrors: { postId: string; error: string }[] = [];
  const facebookConfigured = Boolean(token);

  // Page-level numbers (followers + recent Page posts, whatever published them).
  const page = token && pageId ? await fetchPageInfo(pageId, token) : null;
  const pagePosts = token && pageId ? await fetchPagePosts(pageId, token) : [];
  pagePosts.sort((a, b) => b.engagement - a.engagement);

  for (const post of published) {
    let likes = post.metrics?.likes ?? 0;
    let comments = post.metrics?.comments ?? 0;
    let shares = post.metrics?.shares ?? 0;
    let metricsUpdatedAt = post.metrics?.updatedAt;

    if (token && post.facebookPostId) {
      const { stats: fresh, error: statsError } = await fetchPostStats(post.facebookPostId, token);
      if (statsError) {
        statsErrors.push({ postId: post.id, error: `Không lấy được số liệu Facebook (${statsError}). Kiểm tra token/quyền của Page.` });
      } else if (fresh) {
        ({ likes, comments, shares } = fresh);
        metricsUpdatedAt = new Date().toISOString();
        await updatePost(
          post.id,
          { metrics: { likes, comments, shares, updatedAt: metricsUpdatedAt }, activityAction: "refreshed Facebook stats" },
          "analytics",
        );
      }
    }

    const snippet = post.content.replace(/\s+/g, " ").trim().slice(0, 80) || "Untitled";
    stats.push({
      id: post.id,
      snippet,
      publishedAt: post.publishedAt,
      facebookPostId: post.facebookPostId,
      likes,
      comments,
      shares,
      engagement: likes + comments * 2 + shares * 3,
      metricsUpdatedAt,
    });
  }

  stats.sort((a, b) => b.engagement - a.engagement);

  // Best posting hour heuristic: average engagement by hour of day.
  // Hours are computed in Vietnam time (UTC+7) — the server runs on UTC,
  // so getHours() alone would be 7 hours behind for the team.
  const byHour: Record<number, { total: number; count: number }> = {};
  for (const s of stats) {
    if (!s.publishedAt) continue;
    const hour = (new Date(s.publishedAt).getUTCHours() + 7) % 24;
    byHour[hour] = byHour[hour] || { total: 0, count: 0 };
    byHour[hour].total += s.engagement;
    byHour[hour].count += 1;
  }
  let bestHour: number | null = null;
  let bestAvg = -1;
  for (const [hourStr, v] of Object.entries(byHour)) {
    const avg = v.total / v.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestHour = Number(hourStr);
    }
  }

  return NextResponse.json({
    facebookConfigured,
    totalPublished: published.length,
    bestHour,
    stats,
    statsErrors,
    page,
    pagePosts,
  });
}
