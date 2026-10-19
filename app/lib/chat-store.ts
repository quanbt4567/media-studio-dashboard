import { readStore, writeStore } from "./storage";

/**
 * Team chat: 1-on-1 DMs (Zalo-style, only the recipient gets it) plus one
 * group conversation for the whole team. Backed by the shared storage layer
 * so it works on Supabase/KV/file like everything else.
 */

export interface ChatMessage {
  id: string;
  from: string;
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: "dm" | "group";
  participants: string[];
  /** Display title: group name or the other person's username. */
  title: string;
  messages: ChatMessage[];
  /** username -> ISO time they last read this conversation. */
  lastReadAt: Record<string, string>;
  updatedAt: string;
}

const MAX_MESSAGES = 200;
export const GROUP_ID = "group:team";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function dmId(a: string, b: string): string {
  const [x, y] = [a.toLowerCase(), b.toLowerCase()].sort();
  return `dm:${x}:${y}`;
}

async function readConversations(): Promise<Conversation[]> {
  return readStore<Conversation[]>("chat", []);
}

async function writeConversations(list: Conversation[]): Promise<void> {
  await writeStore("chat", list);
}

function ensureGroup(list: Conversation[], usernames: string[]): boolean {
  let changed = false;
  let group = list.find((c) => c.id === GROUP_ID);
  if (!group) {
    group = {
      id: GROUP_ID,
      type: "group",
      participants: [...usernames],
      title: "Nhóm BCN",
      messages: [],
      lastReadAt: {},
      updatedAt: new Date().toISOString(),
    };
    list.push(group);
    changed = true;
  } else {
    // Keep membership in sync if the team roster changes.
    const missing = usernames.filter((u) => !group!.participants.includes(u));
    if (missing.length > 0) {
      group.participants.push(...missing);
      changed = true;
    }
  }
  return changed;
}

function ensureDm(list: Conversation[], me: string, other: string): boolean {
  const id = dmId(me, other);
  if (list.some((c) => c.id === id)) return false;
  list.push({
    id,
    type: "dm",
    participants: [me, other],
    title: other,
    messages: [],
    lastReadAt: {},
    updatedAt: new Date().toISOString(),
  });
  return true;
}

/** All conversations visible to a user: the team group + a DM per teammate. */
export async function listConversations(me: string, teammates: string[]): Promise<Conversation[]> {
  const list = await readConversations();
  const others = teammates.filter((u) => u.toLowerCase() !== me.toLowerCase());
  let changed = ensureGroup(list, [me, ...others]);
  others.forEach((other) => {
    if (ensureDm(list, me, other)) changed = true;
  });
  // Don't write on every read — only when a conversation was actually created
  // or the group roster changed. Keeps the 8s chat poll cheap.
  if (changed) {
    await writeConversations(list);
  }
  return list
    .filter((c) => c.participants.some((p) => p.toLowerCase() === me.toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getConversation(id: string, me: string): Promise<Conversation | null> {
  const list = await readConversations();
  const conv = list.find((c) => c.id === id) ?? null;
  if (!conv) return null;
  if (!conv.participants.some((p) => p.toLowerCase() === me.toLowerCase())) return null;
  return conv;
}

export function unreadCount(conv: Conversation, me: string): number {
  const since = conv.lastReadAt[me.toLowerCase()] ?? "";
  return conv.messages.filter(
    (m) => m.from.toLowerCase() !== me.toLowerCase() && m.createdAt > since,
  ).length;
}

/** Append a message; returns the conversation (for notifying others). */
export async function sendMessage(
  conversationId: string,
  from: string,
  text: string,
): Promise<Conversation | null> {
  const clean = text.trim().slice(0, 2000);
  if (!clean) return null;
  const list = await readConversations();
  const conv = list.find((c) => c.id === conversationId);
  if (!conv) return null;
  if (!conv.participants.some((p) => p.toLowerCase() === from.toLowerCase())) return null;
  const now = new Date().toISOString();
  conv.messages.push({ id: uid("msg"), from, text: clean, createdAt: now });
  conv.messages = conv.messages.slice(-MAX_MESSAGES);
  conv.updatedAt = now;
  conv.lastReadAt[from.toLowerCase()] = now;
  await writeConversations(list);
  return conv;
}

export async function markRead(conversationId: string, me: string): Promise<void> {
  const list = await readConversations();
  const conv = list.find((c) => c.id === conversationId);
  if (!conv) return;
  conv.lastReadAt[me.toLowerCase()] = new Date().toISOString();
  await writeConversations(list);
}
