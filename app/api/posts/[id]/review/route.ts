import { NextResponse } from "next/server";
import { addComment, getPost, updatePost } from "@/app/lib/posts-store";
import { notify } from "@/app/lib/notifications";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/posts/[id]/review — admin one-click review.
 * { decision: "approved" | "rejected", note?: string, sendBackTo?: "writer" | "designer" }
 * - approved  → status becomes Approved
 * - rejected  → status goes back to Draft (writer) or Waiting Media (designer),
 *   chosen by the admin; a note is required so the right person knows what
 *   to fix, and the note is also posted as a comment (no more Zalo messages).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Only admins can review posts." }, { status: 403 });
  }

  const { id } = await params;
  const post = await getPost(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  if (post.status !== "Review Pending") {
    return NextResponse.json(
      { error: `Only posts in "Review Pending" can be reviewed (current: ${post.status}).` },
      { status: 400 },
    );
  }

  let decision: unknown;
  let note = "";
  let sendBackTo: "writer" | "designer" = "writer";
  try {
    const body = (await request.json()) as { decision?: unknown; note?: unknown; sendBackTo?: unknown };
    decision = body.decision;
    if (typeof body.note === "string") note = body.note.trim();
    if (body.sendBackTo === "designer" || body.sendBackTo === "writer") sendBackTo = body.sendBackTo;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: 'Decision must be "approved" or "rejected".' }, { status: 400 });
  }
  if (decision === "rejected" && !note) {
    return NextResponse.json({ error: "A note is required when rejecting, so the team knows what to fix." }, { status: 400 });
  }
  // Designer gate: cannot approve a post the designer hasn't illustrated —
  // unless the writer chose the fast lane (text-only straight to admin).
  if (decision === "approved" && !post.imageDataUrl && !post.videoUrl && !post.visualSkipped) {
    return NextResponse.json(
      { error: "Không thể duyệt: bài viết chưa có hình ảnh/video từ designer. Hãy trả bài về cho designer để bổ sung." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  if (decision === "rejected") {
    // The reject note is also posted as a comment so the right person sees
    // it in the post's discussion thread — no Zalo message needed.
    const targetLabel = sendBackTo === "designer" ? "designer" : "writer";
    await addComment(id, {
      author: user.username,
      role: user.role,
      text: `↩ Admin trả bài về cho ${targetLabel}: ${note}`,
    });
    const updated = await updatePost(
      id,
      {
        status: sendBackTo === "designer" ? "Waiting Media" : "Draft",
        review: { decision, by: user.username, at: now, note, sendBackTo },
        activityAction: `sent the post back to the ${targetLabel} for revision: ${note}`,
      },
      user.username,
    );
    notify(
      [sendBackTo === "designer" ? "media" : "content"],
      `↩ Admin trả bài về cho bạn: ${note.slice(0, 80)}`,
      id,
    );
    return NextResponse.json({ post: updated });
  }

  const updated = await updatePost(
    id,
    {
      status: "Approved",
      review: { decision, by: user.username, at: now, note },
      activityAction: "approved the post ✓",
    },
    user.username,
  );

  notify(["content", "media"], "✅ Bài của bạn đã được admin duyệt", id);
  return NextResponse.json({ post: updated });
}
