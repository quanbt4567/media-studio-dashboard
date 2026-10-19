import { readStore, writeStore } from "./storage";
import type { Role } from "./roles";

/**
 * In-app notifications. Since Telegram/Zalo were removed, this is the team's
 * signal channel: handoffs, send-backs, approvals and publishes land here,
 * scoped per role so each person only sees what concerns them.
 */

export interface AppNotification {
  id: string;
  forRole: Role;
  /** When set, only this user sees it (DMs). Otherwise role-scoped. */
  forUser?: string;
  message: string;
  postId?: string;
  createdAt: string;
  readBy: string[];
}

const MAX_KEEP = 60;

function uid(): string {
  return `ntf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function readNotifications(): Promise<AppNotification[]> {
  const list = await readStore<AppNotification[]>("notifications", []);
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readNotificationsFor(role: Role, username: string): Promise<{ items: AppNotification[]; unread: number }> {
  const all = await readNotifications();
  const items = all.filter((n) => n.forRole === role || n.forUser === username);
  return { items, unread: items.filter((n) => !n.readBy.includes(username)).length };
}

/** Emit a notification to one or more roles. Fire-and-forget safe. */
export async function notify(roles: Role[], message: string, postId?: string): Promise<void> {
  try {
    const all = await readNotifications();
    const now = new Date().toISOString();
    const fresh: AppNotification[] = roles.map((forRole) => ({
      id: uid(),
      forRole,
      message,
      postId,
      createdAt: now,
      readBy: [],
    }));
    await writeStore("notifications", [...fresh, ...all].slice(0, MAX_KEEP));
  } catch (err) {
    console.warn("Could not write notification:", err);
  }
}

/** Emit a notification to specific users (DMs). Needs each user's role for scoping. */
export async function notifyUsers(
  targets: { username: string; role: Role }[],
  message: string,
): Promise<void> {
  try {
    const all = await readNotifications();
    const now = new Date().toISOString();
    const fresh: AppNotification[] = targets.map(({ username, role }) => ({
      id: uid(),
      forRole: role,
      forUser: username,
      message,
      createdAt: now,
      readBy: [],
    }));
    await writeStore("notifications", [...fresh, ...all].slice(0, MAX_KEEP));
  } catch (err) {
    console.warn("Could not write notification:", err);
  }
}

export async function markNotificationsRead(role: Role, username: string, ids?: string[]): Promise<void> {
  const all = await readNotifications();
  const next = all.map((n) =>
    n.forRole === role && (!ids || ids.includes(n.id)) && !n.readBy.includes(username)
      ? { ...n, readBy: [...n.readBy, username] }
      : n,
  );
  await writeStore("notifications", next);
}
