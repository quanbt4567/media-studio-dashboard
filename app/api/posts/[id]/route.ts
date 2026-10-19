import { NextResponse } from "next/server";
import type { PostStatus } from "@/app/components/post-status-switcher";
import { getAllowedTransitions, ROLE_PERMISSIONS } from "@/app/lib/roles";
import { deletePost, getPost, updatePost, type PostUpdate } from "@/app/lib/posts-store";
import { saveFormat } from "@/app/lib/format-store";
import { notify } from "@/app/lib/notifications";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

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

/** GET /api/posts/[id] — fetch one post. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const post = await getPost(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  return NextResponse.json({ post });
}

/** PUT /api/posts/[id] — update a post, with per-role field permissions. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const current = await getPost(id);
  if (!current) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  // Published posts are frozen: every role (writer, media, admin) is view-only.
  if (current.status === "Published") {
    return NextResponse.json(
      { error: "Bài viết đã xuất bản — chỉ được xem lại, không thể chỉnh sửa." },
      { status: 403 },
    );
  }

  let patch: PostPatch;
  try {
    patch = (await request.json()) as PostPatch;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const permissions = ROLE_PERMISSIONS[user.role];
  const update: PostUpdate = {};

  if (patch.content !== undefined) {
    if (!permissions.canEditText) {
      return NextResponse.json({ error: "Your role cannot edit the post text." }, { status: 403 });
    }
    update.content = patch.content;
    update.activityAction = "updated the text";
  }

  if (patch.imageDataUrl !== undefined || patch.clearImage) {
    if (!permissions.canUploadMedia) {
      return NextResponse.json({ error: "Your role cannot manage images." }, { status: 403 });
    }
    if (patch.clearImage) {
      update.clearImage = true;
      update.activityAction = "removed the image";
    } else if (patch.imageDataUrl) {
      if (patch.imageDataUrl.length > MAX_IMAGE_BYTES * 1.4) {
        return NextResponse.json({ error: "Image is too large (max 5 MB)." }, { status: 400 });
      }
      update.imageDataUrl = patch.imageDataUrl;
      update.imageName = typeof patch.imageName === "string" ? patch.imageName : "upload.jpg";
      update.activityAction = "updated the image";
    }
  }

  if (patch.videoUrl !== undefined || patch.clearVideo) {
    if (!permissions.canUploadMedia) {
      return NextResponse.json({ error: "Your role cannot manage videos." }, { status: 403 });
    }
    // Videos live on Vercel Blob (public URL) — no data-URL size limit here;
    // the upload endpoint already enforces type + 100 MB.
    if (patch.clearVideo) {
      update.clearVideo = true;
      update.activityAction = "removed the video";
    } else if (patch.videoUrl) {
      if (!/^https:\/\/.+/.test(patch.videoUrl)) {
        return NextResponse.json({ error: "Video URL must be a public https URL." }, { status: 400 });
      }
      update.videoUrl = patch.videoUrl;
      update.videoName = typeof patch.videoName === "string" ? patch.videoName : "video.mp4";
      update.activityAction = "updated the video";
    }
  }

  if (patch.scheduledAt !== undefined || patch.clearScheduledAt) {
    // Scheduling is part of publishing: admin only.
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Chỉ admin được hẹn lịch đăng bài." }, { status: 403 });
    }
    if (patch.clearScheduledAt) {
      update.clearScheduledAt = true;
      update.activityAction = "cleared the scheduled time";
    } else if (patch.scheduledAt) {
      const when = new Date(patch.scheduledAt);
      if (Number.isNaN(when.getTime())) {
        return NextResponse.json({ error: "Invalid scheduled date." }, { status: 400 });
      }
      update.scheduledAt = when.toISOString();
      update.activityAction = `scheduled the post for ${when.toLocaleString()}`;
    }
  }

  if (patch.visualSkipped !== undefined) {
    // The fast lane is the writer's choice: text-only post straight to admin.
    if (user.role !== "content") {
      return NextResponse.json({ error: "Only writers can choose the fast lane." }, { status: 403 });
    }
    update.visualSkipped = patch.visualSkipped;
  }

  if (patch.status !== undefined && patch.status !== current.status) {
    if (!getAllowedTransitions(user.role, current.status).includes(patch.status)) {
      return NextResponse.json(
        { error: `Your role cannot move the post from ${current.status} to ${patch.status}.` },
        { status: 403 },
      );
    }
    // Designer gate: a post can only go to review once the designer attached
    // a visual (image or video) — unless the writer chose the fast lane
    // (text-only straight to admin).
    const skipVisual = update.visualSkipped === true || (current.visualSkipped === true && update.visualSkipped !== false);
    const hasVisual = current.imageDataUrl || update.imageDataUrl || current.videoUrl || update.videoUrl;
    if (patch.status === "Review Pending" && !skipVisual && !hasVisual) {
      return NextResponse.json(
        { error: "Bài viết chưa có hình ảnh/video. Designer cần gắn hình ảnh hoặc video trước khi gửi duyệt." },
        { status: 400 },
      );
    }
    // Back into the design pipeline → the fast-lane exemption no longer applies.
    if (patch.status === "Waiting Media") {
      update.visualSkipped = false;
    }
    update.status = patch.status;
    update.activityAction = `moved the post to ${patch.status}`;
  }

  const post = await updatePost(id, update, user.username);

  // Auto-save the finished format: when a draft leaves Draft status, its
  // content becomes a reusable template (deduplicated server-side).
  if (post && current.status === "Draft" && (patch.status === "Waiting Media" || patch.status === "Review Pending") && post.content.trim()) {
    const firstLine = post.content.split("\n")[0].trim().slice(0, 40) || "Untitled format";
    saveFormat({ name: firstLine, content: post.content, createdBy: user.username }).catch((err) =>
      console.warn("Could not auto-save format:", err),
    );
  }

  // Notify the next person in the chain (writer/designer handoffs only —
  // admin decisions and publishes notify from their own routes).
  if (post && patch.status && patch.status !== current.status && user.role !== "admin") {
    const snippet = post.content.split("\n")[0]?.trim().slice(0, 50) || "bài viết";
    if (patch.status === "Waiting Media") {
      notify(["media"], `✉️ ${user.username} gửi bài “${snippet}” — cần gắn ảnh`, post.id);
    } else if (patch.status === "Review Pending") {
      notify(
        ["admin"],
        post.visualSkipped
          ? `⚡ ${user.username} gửi thẳng bài text-only “${snippet}” chờ duyệt`
          : `👀 Bài “${snippet}” chờ bạn duyệt`,
        post.id,
      );
    }
  }

  return NextResponse.json({ post });
}

/** DELETE /api/posts/[id] — admins, or the creator while still a draft. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const current = await getPost(id);
  if (!current) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  // Published posts are frozen: every role (writer, media, admin) is view-only.
  if (current.status === "Published") {
    return NextResponse.json(
      { error: "Bài viết đã xuất bản — chỉ được xem lại, không thể xóa." },
      { status: 403 },
    );
  }
  const canDelete = user.role === "admin" || (current.createdBy === user.username && current.status === "Draft");
  if (!canDelete) {
    return NextResponse.json({ error: "Only admins can delete this post." }, { status: 403 });
  }
  await deletePost(id);
  return NextResponse.json({ success: true });
}
