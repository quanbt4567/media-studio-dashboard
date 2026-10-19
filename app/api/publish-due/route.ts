import { NextResponse } from "next/server";
import { publishPostToFacebook } from "@/app/lib/facebook-publish";
import { readPosts, updatePost } from "@/app/lib/posts-store";
import { notify } from "@/app/lib/notifications";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";
// Publishing several posts can take a while; allow headroom on Vercel.
export const maxDuration = 60;

/**
 * /api/publish-due — publish all approved posts whose scheduled time has arrived.
 *
 * Auth: either a logged-in admin session, or the CRON_SECRET bearer token
 * (for Vercel Cron / external schedulers):
 *   Authorization: Bearer <CRON_SECRET>
 *
 * - POST: admin session or cron bearer → publish due posts.
 * - GET: cron bearer → publish due posts (Vercel Cron sends GET);
 *        admin session → preview which posts are due.
 *
 * Set up a real schedule with Vercel Cron (see vercel.json) or a system cron like:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/publish-due
 */

function cronBearerOk(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return Boolean(cronSecret && bearer && bearer === cronSecret);
}

async function adminSessionOk(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.role === "admin";
}

async function runPublishDue() {
  const now = new Date().toISOString();
  const posts = await readPosts();
  const due = posts.filter(
    (post) =>
      post.status === "Approved" &&
      !post.publishedAt &&
      post.scheduledAt &&
      post.scheduledAt <= now,
  );

  const published: { id: string; facebookPostId?: string }[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const post of due) {
    // Designer gate: never auto-publish a post without the designer's visual
    // (unless the writer chose the fast lane).
    if (!post.imageDataUrl && !post.videoUrl && !post.visualSkipped) {
      failed.push({ id: post.id, error: "Thiếu hình ảnh/video từ designer — admin cần trả bài về cho designer." });
      continue;
    }
    const result = await publishPostToFacebook({
      message: post.content,
      imageDataUrl: post.imageDataUrl,
      imageName: post.imageName,
      videoUrl: post.videoUrl,
    });
    if (result.ok) {
      await updatePost(
        post.id,
        {
          status: "Published",
          publishedAt: new Date().toISOString(),
          facebookPostId: result.facebookPostId,
          activityAction: `auto-published to Facebook${result.facebookPostId ? ` (${result.facebookPostId})` : ""}`,
        },
        "scheduler",
      );
      published.push({ id: post.id, facebookPostId: result.facebookPostId });
      notify(["content", "media"], "🚀 Bài đã tự đăng theo lịch lên Facebook", post.id);
    } else {
      failed.push({ id: post.id, error: result.error || "Unknown error" });
    }
  }

  return NextResponse.json({ checkedAt: now, due: due.length, published, failed });
}

export async function POST(request: Request) {
  if (!cronBearerOk(request) && !(await adminSessionOk())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  return runPublishDue();
}

export async function GET(request: Request) {
  // Vercel Cron calls this endpoint with GET + the CRON_SECRET bearer token.
  if (cronBearerOk(request)) {
    return runPublishDue();
  }
  if (!(await adminSessionOk())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const now = new Date().toISOString();
  const posts = await readPosts();
  const due = posts.filter(
    (post) =>
      post.status === "Approved" &&
      !post.publishedAt &&
      post.scheduledAt &&
      post.scheduledAt <= now,
  );
  return NextResponse.json({
    now,
    due: due.map((post) => ({ id: post.id, scheduledAt: post.scheduledAt, snippet: post.content.slice(0, 80) })),
  });
}
