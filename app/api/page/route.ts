import { NextResponse } from "next/server";
import { resolveApiKey } from "@/app/lib/settings-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/page — public Facebook Page info for the "View live site" button.
 * The Page ID is public information (visible on every Page), so it's safe
 * to expose; the access token never leaves the server.
 */
export async function GET() {
  const pageId = await resolveApiKey("fbPageId");
  if (!pageId) return NextResponse.json({ pageId: null });
  return NextResponse.json({
    pageId,
    url: `https://www.facebook.com/${encodeURIComponent(pageId)}`,
  });
}
