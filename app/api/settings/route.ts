import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { getPublicSettings, saveSettings, type AppSettings } from "@/app/lib/settings-store";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = ["geminiApiKey", "xkiroApiKey", "fbPageId", "fbPageAccessToken", "blobToken"] as const;

/**
 * GET /api/settings — masked view of configured API keys (admin only).
 * Full values never leave the server.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  return NextResponse.json({ settings: await getPublicSettings() });
}

/**
 * POST /api/settings — save API keys (admin only).
 * Body: { geminiApiKey?, xkiroApiKey?, fbPageId?, fbPageAccessToken? }
 * Empty string clears a key. Values are stored encrypted.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only." }, { status: 403 });

  let body: Partial<AppSettings>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const partial: Partial<AppSettings> = {};
  for (const key of ALLOWED_KEYS) {
    if (typeof body[key] === "string") partial[key] = body[key];
  }
  if (Object.keys(partial).length === 0) {
    return NextResponse.json({ error: "No known settings fields provided." }, { status: 400 });
  }

  try {
    await saveSettings(partial);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save settings." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, settings: await getPublicSettings() });
}
