import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { getUsers } from "@/app/lib/auth";
import {
  dmId,
  getConversation,
  GROUP_ID,
  listConversations,
  markRead,
  sendMessage,
  unreadCount,
} from "@/app/lib/chat-store";
import { notifyUsers } from "@/app/lib/notifications";

export const dynamic = "force-dynamic";

function roster() {
  return getUsers().map((u) => ({ username: u.username, role: u.role }));
}

/**
 * GET /api/chat — my conversations (group + DMs) with unread counts + roster.
 * GET /api/chat?conversationId=... — thread messages (marks as read).
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("conversationId");
  const users = roster();
  const teammates = users.map((u) => u.username);

  if (id) {
    const conv = await getConversation(id, user.username);
    if (!conv) return NextResponse.json({ error: "Not found." }, { status: 404 });
    await markRead(id, user.username);
    return NextResponse.json({ conversation: conv });
  }

  const conversations = await listConversations(user.username, teammates);
  return NextResponse.json({
    users,
    conversations: conversations.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.type === "dm" ? c.participants.find((p) => p.toLowerCase() !== user.username.toLowerCase()) ?? c.title : c.title,
      participants: c.participants,
      lastMessage: c.messages[c.messages.length - 1] ?? null,
      unread: unreadCount(c, user.username),
      updatedAt: c.updatedAt,
    })),
  });
}

/**
 * POST /api/chat — send a message.
 * Body: { text, conversationId? } or { text, to } for a DM.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: { text?: unknown; conversationId?: unknown; to?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request không hợp lệ." }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "Tin nhắn trống." }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Tin nhắn quá dài." }, { status: 400 });

  const users = roster();
  const teammates = users.map((u) => u.username);
  // Ensure conversations exist before resolving the target.
  await listConversations(user.username, teammates);

  let conversationId =
    typeof body.conversationId === "string" ? body.conversationId : null;
  if (!conversationId && typeof body.to === "string") {
    const toName = body.to;
    const other = users.find((u) => u.username.toLowerCase() === toName.toLowerCase());
    if (!other) return NextResponse.json({ error: "Không tìm thấy người nhận." }, { status: 404 });
    if (other.username.toLowerCase() === user.username.toLowerCase()) {
      return NextResponse.json({ error: "Không tự nhắn cho chính mình." }, { status: 400 });
    }
    conversationId = dmId(user.username, other.username);
  }
  if (!conversationId) {
    return NextResponse.json({ error: "Thiếu người nhận." }, { status: 400 });
  }

  const conv = await sendMessage(conversationId, user.username, text);
  if (!conv) return NextResponse.json({ error: "Không gửi được." }, { status: 404 });

  // Notify everyone else in the conversation (DM: the one recipient; group: all).
  const others = conv.participants.filter(
    (p) => p.toLowerCase() !== user.username.toLowerCase(),
  );
  const targets = others
    .map((name) => users.find((u) => u.username.toLowerCase() === name.toLowerCase()))
    .filter((u): u is { username: string; role: (typeof users)[number]["role"] } => !!u);
  const label = conv.type === "group" ? "Nhóm BCN" : user.username;
  await notifyUsers(
    targets,
    `Tin nhắn từ ${label}: ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`,
  );

  return NextResponse.json({ ok: true, conversationId: conv.id });
}
