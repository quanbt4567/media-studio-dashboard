import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { createPost, readPosts } from "@/app/lib/posts-store";

export const dynamic = "force-dynamic";

/** GET /api/posts — list all posts, newest first. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const posts = await readPosts();
  posts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return NextResponse.json({ posts });
}

/** POST /api/posts — create a new draft post. Content (writer) role only. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "content") {
    return NextResponse.json({ error: "Chỉ writer được tạo bài viết mới." }, { status: 403 });
  }

  let content = "";
  try {
    const body = (await request.json()) as { content?: unknown };
    if (typeof body.content === "string") content = body.content;
  } catch {
    // Empty body is fine — creates a blank draft.
  }

  const post = await createPost({ content, createdBy: user.username });
  return NextResponse.json({ post }, { status: 201 });
}
