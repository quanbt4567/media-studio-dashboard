import type { PostStatus } from "../components/post-status-switcher";

/**
 * Roles in the 3-actor workflow model. Server-safe (no "use client"),
 * so API routes can import it too.
 */
export type Role = "content" | "media" | "admin";

export interface RolePermissions {
  canGenerateAI: boolean;
  canEditText: boolean;
  canUploadMedia: boolean;
  canPublish: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  // Strict separation: writer writes, designer designs, admin only reviews + publishes.
  content: { canGenerateAI: true, canEditText: true, canUploadMedia: false, canPublish: false },
  media: { canGenerateAI: false, canEditText: false, canUploadMedia: true, canPublish: false },
  admin: { canGenerateAI: false, canEditText: false, canUploadMedia: false, canPublish: true },
};

const ALL_STATUSES: PostStatus[] = ["Draft", "Waiting Media", "Review Pending", "Approved"];

/** Statuses the given role is allowed to move TO from the current status. */
export function getAllowedTransitions(role: Role, current: PostStatus): PostStatus[] {
  // "Published" is terminal — it is only set by the publish flow itself.
  if (current === "Published") return [];
  if (role === "admin") return ALL_STATUSES.filter((status) => status !== current);
  if (role === "content") return current === "Draft" ? ["Waiting Media", "Review Pending"] : [];
  // Designer: send to review, or hand the post back to the writer for fixes.
  return current === "Waiting Media" ? ["Review Pending", "Draft"] : [];
}
