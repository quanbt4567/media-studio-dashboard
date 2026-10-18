/**
 * Shared helper: fetch the most recent posts from the connected Facebook Page.
 * Used by /api/fetch-page-posts and by /api/generate (tone-of-voice few-shot).
 */

export interface PagePost {
  id: string;
  message?: string;
  created_time?: string;
}

const GRAPH_VERSION = "v25.0";

/** Returns up to `limit` recent post messages (newest first). Throws on misconfiguration or API errors. */
export async function getRecentPagePosts(limit = 5): Promise<string[]> {
  const pageId = process.env.FB_PAGE_ID;
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;

  if (!pageId || !pageAccessToken) {
    throw new Error("Facebook page credentials are not configured.");
  }

  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}/posts` +
    `?fields=message,created_time&limit=${limit}&access_token=${encodeURIComponent(pageAccessToken)}`;

  const response = await fetch(url, { next: { revalidate: 300 } });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "Facebook rejected the posts request.");
  }

  const posts: PagePost[] = Array.isArray(data.data) ? data.data : [];
  return posts
    .map((post) => post.message?.trim())
    .filter((message): message is string => !!message);
}
