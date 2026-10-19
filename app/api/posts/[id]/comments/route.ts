import { NextResponse } from "next/server";
import { addComment, getPost } from "@/app/lib/posts-store";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/posts/[id]/comments — add a comment to a post.
 * Any logged-in team member can comment: this is the in-app
 * replacement for scattered Zalo threads.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const post = await getPost(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  // Published posts are frozen: view-only for every role, no new comments.
  if (post.status === "Published") {
    return NextResponse.json(
      { error: "Bài viết đã xuất bản — chỉ được xem lại, không thể bình luận thêm." },
      { status: 403 },
    );
  }

  let text = "";
  try {
    const body = (await request.json()) as { text?: unknown };
    if (typeof body.text === "string") text = body.text.trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Comment text is required." }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Comment is too long (max 2000 characters)." }, { status: 400 });
  }

  const updated = await addComment(id, { author: user.username, role: user.role, text });
  return NextResponse.json({ post: updated }, { status: 201 });
}
