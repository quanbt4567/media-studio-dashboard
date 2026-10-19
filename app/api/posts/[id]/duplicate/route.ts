import { NextResponse } from "next/server";
import { createPost, getPost, updatePost } from "@/app/lib/posts-store";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/posts/[id]/duplicate — writer-only: copy a post (text + visual)
 * into a fresh Draft, e.g. for recurring weekly formats.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "content") {
    return NextResponse.json({ error: "Chỉ writer được nhân bản bài viết." }, { status: 403 });
  }
  const { id } = await params;
  const source = await getPost(id);
  if (!source) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  const post = await createPost({ content: source.content, createdBy: user.username });
  // Copy the visual as well (image data URL or Blob video URL).
  const updated = await updatePost(
    post.id,
    {
      ...(source.imageDataUrl ? { imageDataUrl: source.imageDataUrl, imageName: source.imageName } : {}),
      ...(source.videoUrl ? { videoUrl: source.videoUrl, videoName: source.videoName } : {}),
      activityAction: `duplicated from post ${source.id.slice(0, 8)}`,
    },
    user.username,
  );
  return NextResponse.json({ post: updated ?? post }, { status: 201 });
}
