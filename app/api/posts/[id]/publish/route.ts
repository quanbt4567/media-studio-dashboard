import { NextResponse } from "next/server";
import { publishPostToFacebook } from "@/app/lib/facebook-publish";
import { getPost, updatePost } from "@/app/lib/posts-store";
import { notify } from "@/app/lib/notifications";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/posts/[id]/publish — publish an approved post to the Fanpage.
 * Admin only. The post must be in "Approved" status (or already scheduled).
 * On success the post moves to "Published" with publishedAt + facebookPostId.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const post = await getPost(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  if (post.status !== "Approved") {
    return NextResponse.json(
      { error: `Only approved posts can be published (current: ${post.status}).` },
      { status: 400 },
    );
  }
  if (post.publishedAt) {
    return NextResponse.json({ error: "This post was already published." }, { status: 400 });
  }
  // Designer gate: never publish a post the designer hasn't illustrated
  // (image or video) — unless the writer chose the fast lane.
  if (!post.imageDataUrl && !post.videoUrl && !post.visualSkipped) {
    return NextResponse.json(
      { error: "Không thể đăng: bài viết chưa có hình ảnh/video từ designer. Hãy trả bài về cho designer để bổ sung." },
      { status: 400 },
    );
  }

  const result = await publishPostToFacebook({
    message: post.content,
    imageDataUrl: post.imageDataUrl,
    imageName: post.imageName,
    videoUrl: post.videoUrl,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, facebookCode: result.code }, { status: 502 });
  }

  const updated = await updatePost(
    id,
    {
      status: "Published",
      publishedAt: new Date().toISOString(),
      facebookPostId: result.facebookPostId,
      activityAction: `published to Facebook${result.facebookPostId ? ` (${result.facebookPostId})` : ""}`,
    },
    user.username,
  );

  await notify(["content", "media"], "🚀 Bài đã được đăng lên Facebook", id);
  return NextResponse.json({ post: updated, facebookPostId: result.facebookPostId });
}
