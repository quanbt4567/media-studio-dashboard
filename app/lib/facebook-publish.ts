/**
 * Shared Facebook publishing logic, used by both the manual publish route
 * and the scheduled auto-publish endpoint.
 */
import { resolveApiKey } from "./settings-store";

export interface PublishInput {
  message: string;
  imageDataUrl?: string;
  imageName?: string;
  /** Public video URL (Vercel Blob). Takes precedence over the image. */
  videoUrl?: string;
}

export interface PublishResult {
  ok: boolean;
  facebookPostId?: string;
  error?: string;
  code?: number;
}

/**
 * Facebook renders post text exactly as sent — it does not parse Markdown.
 * Strip bold/italic/heading markers so drafts written with Markdown
 * publish as clean plain text instead of showing raw ** symbols.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|\n)#{1,6}\s+/g, "$1");
}

function dataUrlToParts(dataUrl: string): { buffer: Buffer; mimeType: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return null;
  try {
    return { buffer: Buffer.from(match[2], "base64"), mimeType: match[1] };
  } catch {
    return null;
  }
}

export async function publishPostToFacebook(input: PublishInput): Promise<PublishResult> {
  const message = stripMarkdown(input.message.trim());
  const pageId = await resolveApiKey("fbPageId");
  const pageAccessToken = await resolveApiKey("fbPageAccessToken");

  if (!message) {
    return { ok: false, error: "Post content is required." };
  }
  if (!pageId || !pageAccessToken) {
    return { ok: false, error: "Facebook page credentials are not configured." };
  }

  const imageParts = input.imageDataUrl ? dataUrlToParts(input.imageDataUrl) : null;
  // Video posts go through the /videos endpoint with the public file URL.
  // (Blob URLs are public, so Facebook can fetch the file itself.)
  if (input.videoUrl) {
    const videosUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/videos`;
    let facebookResponse: Response;
    try {
      facebookResponse = await fetch(videosUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: message,
          file_url: input.videoUrl,
          access_token: pageAccessToken,
        }),
      });
    } catch (networkError) {
      return { ok: false, error: networkError instanceof Error ? networkError.message : "Network error reaching Facebook." };
    }
    return parseFacebookResponse(facebookResponse);
  }

  const endpoint = imageParts ? "photos" : "feed";
  const facebookUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/${endpoint}`;

  let facebookResponse: Response;
  try {
    if (imageParts) {
      const form = new FormData();
      form.append("message", message);
      form.append("source", new Blob([new Uint8Array(imageParts.buffer)], { type: imageParts.mimeType }), input.imageName || "upload.jpg");
      form.append("access_token", pageAccessToken);
      facebookResponse = await fetch(facebookUrl, { method: "POST", body: form });
    } else {
      facebookResponse = await fetch(facebookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, access_token: pageAccessToken }),
      });
    }
  } catch (networkError) {
    return { ok: false, error: networkError instanceof Error ? networkError.message : "Network error reaching Facebook." };
  }

  return parseFacebookResponse(facebookResponse);
}

async function parseFacebookResponse(facebookResponse: Response): Promise<PublishResult> {
  let facebookData: { id?: string; error?: { message?: string; code?: number } };
  try {
    facebookData = (await facebookResponse.json()) as typeof facebookData;
  } catch {
    return { ok: false, error: `Facebook returned an unreadable response (HTTP ${facebookResponse.status}).` };
  }

  if (!facebookResponse.ok || facebookData.error) {
    const code = facebookData.error?.code;
    const rawError = facebookData.error?.message || "Facebook rejected the post.";
    const error =
      code === 100 || code === 200
        ? "Facebook rejected this request because the Page Access Token is missing pages_manage_posts or pages_read_engagement permission."
        : rawError;
    return { ok: false, error, code };
  }

  return { ok: true, facebookPostId: facebookData.id };
}
