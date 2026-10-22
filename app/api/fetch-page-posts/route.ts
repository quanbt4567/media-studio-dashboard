import { NextResponse } from "next/server";
import { getRecentPagePosts } from "@/app/lib/page-posts";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/fetch-page-posts
 * Returns the most recent posts from the connected Facebook Page so the client
 * (or the AI generator) can learn the page's tone of voice.
 * Session required (defense in depth — don't rely on the proxy alone).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const posts = await getRecentPagePosts(5);
    return NextResponse.json({ posts, count: posts.length });
  } catch (error) {
    console.error("Fetch page posts failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fetch page posts." },
      { status: 502 },
    );
  }
}
