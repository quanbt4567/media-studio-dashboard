import { NextResponse } from "next/server";
import { markNotificationsRead, readNotificationsFor } from "@/app/lib/notifications";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/notifications — the current user's role-scoped notifications. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { items, unread } = await readNotificationsFor(user.role, user.username);
  return NextResponse.json({ notifications: items, unread });
}

/** POST /api/notifications — mark as read. Body: { ids?: string[] } (all when omitted). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : undefined;
  await markNotificationsRead(user.role, user.username, ids);
  return NextResponse.json({ ok: true });
}
