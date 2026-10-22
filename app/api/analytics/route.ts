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
  /** Total reactions of every type (matches the counter shown on Facebook). */
  likes: number;
  reactions?: Record<string, number>;
  comments: number;
  shares: number;
  engagement: number;
  metricsUpdatedAt?: string;
}

const REACTION_TYPES = ["LIKE", "LOVE", "WOW", "HAHA", "SAD", "ANGRY"] as const;

/**
 * Reaction totals for one post. Facebook's UI counter aggregates ALL
 * reaction types, while the classic `likes.summary` only counts the Like
 * type — reading `reactions.summary(true)` (plus per-type aliases in the
 * same call) is what makes the numbers match the Page. Falls back to the
 * legacy likes query if the reactions fields are rejected.
 */
async function fetchPostStats(fbPostId: string, token: string): Promise<{ stats: { likes: number; comments: number; shares: number; reactions?: Record<string, number> } | null; error?: string }> {
  const byTypeFields = REACTION_TYPES.map(
    (t) => `reactions.type(${t}).summary(true).as(reactions_${t.toLowerCase()})`,
  ).join(",");
  try {
    const fields = `reactions.summary(true),${byTypeFields},comments.summary(true)`;
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(fbPostId)}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as Record<string, { summary?: { total_count?: number } } | undefined>;
      const reactions: Record<string, number> = {};
      for (const t of REACTION_TYPES) {
        const count = data[`reactions_${t.toLowerCase()}`]?.summary?.total_count ?? 0;
        if (count > 0) reactions[t] = count;
      }
      return {
        stats: {
          likes: data.reactions?.summary?.total_count ?? 0,
          comments: data.comments?.summary?.total_count ?? 0,
          shares: 0,
          reactions,
        },
      };
    }
    // Reactions fields rejected (older token/permissions) — legacy fallback.
    const legacyParams = new URLSearchParams({ fields: "likes.summary(true),comments.summary(true)", access_token: token });
    const legacyRes = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(fbPostId)}?${legacyParams.toString()}`);
    if (!legacyRes.ok) {
      let detail = `HTTP ${legacyRes.status}`;
      try {
        const errBody = (await legacyRes.json()) as { error?: { message?: string } };
        if (errBody?.error?.message) detail += ` — ${errBody.error.message}`;
      } catch { /* ignore parse errors */ }
      return { stats: null, error: detail };
    }
    const legacy = (await legacyRes.json()) as {
      likes?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
    };
    return {
      stats: {
        likes: legacy.likes?.summary?.total_count ?? 0,
        comments: legacy.comments?.summary?.total_count ?? 0,
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
  /** Total reactions of every type. */
  likes: number;
  reactions?: Record<string, number>;
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
  const byTypeFields = REACTION_TYPES.map(
    (t) => `reactions.type(${t}).summary(true).as(reactions_${t.toLowerCase()})`,
  ).join(",");
  const parse = (data: {
    data?: (Record<string, { summary?: { total_count?: number } } | undefined> & {
      id?: string;
      message?: string;
      created_time?: string;
      comments?: { summary?: { total_count?: number } };
      shares?: { count?: number };
      full_picture?: string;
    })[];
  }): PagePostStats[] =>
    (data.data ?? []).map((p) => {
      const reactions: Record<string, number> = {};
      for (const t of REACTION_TYPES) {
        const count = p[`reactions_${t.toLowerCase()}`]?.summary?.total_count ?? 0;
        if (count > 0) reactions[t] = count;
      }
      const likes = p.reactions?.summary?.total_count ?? 0;
      const comments = p.comments?.summary?.total_count ?? 0;
      const shares = p.shares?.count ?? 0;
      return {
        id: p.id ?? "",
        snippet: ((p.message ?? "").split(/\n/)[0] ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || "Untitled",
        createdAt: p.created_time,
        likes,
        reactions,
        comments,
        shares,
        engagement: likes + comments * 2 + shares * 3,
        picture: p.full_picture,
      };
    });
  try {
    const base = `reactions.summary(true),${byTypeFields},comments.summary(true),full_picture`;
    const attempts = [
      `id,message,created_time,${base},shares`,
      `id,message,created_time,${base}`,
      "id,message,created_time,likes.summary(true),comments.summary(true),shares,full_picture",
    ];
    for (const fields of attempts) {
      const params = new URLSearchParams({ fields, limit: "20", access_token: token });
      const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}/posts?${params.toString()}`);
      if (res.ok) return parse((await res.json()) as Parameters<typeof parse>[0]);
    }
    return [];
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

  // Page-level numbers (followers + recent Page posts) — fetched in parallel.
  const [page, pagePosts] = token && pageId
    ? await Promise.all([fetchPageInfo(pageId, token), fetchPagePosts(pageId, token)])
    : [null, [] as PagePostStats[]];
  pagePosts.sort((a, b) => b.engagement - a.engagement);

  // Per-post metrics. Posts refreshed within the freshness window reuse
  // their cached numbers (no Facebook call, no store write); the rest are
  // fetched with bounded concurrency instead of one-by-one.
  const FRESH_MS = 10 * 60 * 1000;
  const CONCURRENCY = 6;
  const now = Date.now();
  const isFresh = (post: (typeof published)[number]) =>
    Boolean(post.metrics?.updatedAt) && now - new Date(post.metrics!.updatedAt).getTime() < FRESH_MS;
  const stale = published.filter((post) => token && post.facebookPostId && !isFresh(post));
  const freshById = new Map<string, { likes: number; comments: number; shares: number; reactions?: Record<string, number> }>();
  for (let i = 0; i < stale.length; i += CONCURRENCY) {
    const batch = stale.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (post) => ({ post, result: await fetchPostStats(post.facebookPostId!, token!) })),
    );
    for (const { post, result } of results) {
      if (result.error) {
        statsErrors.push({ postId: post.id, error: `Không lấy được số liệu Facebook (${result.error}). Kiểm tra token/quyền của Page.` });
      } else if (result.stats) {
        freshById.set(post.id, result.stats);
      }
    }
  }

  // Write back only posts whose numbers actually changed — silently (no
  // activity-timeline spam, no updatedBy/updatedAt churn).
  const writes: Promise<unknown>[] = [];
  for (const post of published) {
    const fresh = freshById.get(post.id);
    if (!fresh) continue;
    const changed =
      fresh.likes !== (post.metrics?.likes ?? 0) ||
      fresh.comments !== (post.metrics?.comments ?? 0) ||
      fresh.shares !== (post.metrics?.shares ?? 0) ||
      JSON.stringify(fresh.reactions ?? {}) !== JSON.stringify(post.metrics?.reactions ?? {});
    if (changed || !post.metrics) {
      writes.push(
        updatePost(
          post.id,
          { metrics: { ...fresh, updatedAt: new Date().toISOString() }, silent: true },
          "analytics",
        ),
      );
    }
  }
  await Promise.all(writes);

  for (const post of published) {
    const fresh = freshById.get(post.id);
    const likes = fresh?.likes ?? post.metrics?.likes ?? 0;
    const comments = fresh?.comments ?? post.metrics?.comments ?? 0;
    const shares = fresh?.shares ?? post.metrics?.shares ?? 0;
    const reactions = fresh?.reactions ?? post.metrics?.reactions;
    const metricsUpdatedAt = fresh ? new Date().toISOString() : post.metrics?.updatedAt;

    const snippet = (post.content.split(/\n/)[0] ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || "Untitled";
    stats.push({
      id: post.id,
      snippet,
      publishedAt: post.publishedAt,
      facebookPostId: post.facebookPostId,
      likes,
      reactions,
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
