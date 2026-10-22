import { NextResponse } from "next/server";
import { getPrefs, setBrandVoice } from "@/app/lib/prefs-store";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/prefs — team preferences (Brand Voice). Any signed-in user. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const prefs = await getPrefs();
  return NextResponse.json({ brandVoice: prefs.brandVoice ?? "" });
}

/** PUT /api/prefs — admin only. Body: { brandVoice: string } */
export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Chỉ admin được sửa hồ sơ giọng văn." }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { brandVoice?: unknown };
  if (typeof body.brandVoice !== "string") {
    return NextResponse.json({ error: "brandVoice phải là chuỗi văn bản." }, { status: 400 });
  }
  if (body.brandVoice.length > 1000) {
    return NextResponse.json({ error: "Giọng văn tối đa 1000 ký tự." }, { status: 400 });
  }
  const prefs = await setBrandVoice(body.brandVoice);
  return NextResponse.json({ brandVoice: prefs.brandVoice ?? "" });
}
