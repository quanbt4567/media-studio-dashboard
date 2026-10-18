"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PostStatus } from "../app/components/post-status-switcher";
import type { Role, SessionPayload } from "../app/lib/auth";

/**
 * Session-based auth context. The role comes from the logged-in user's
 * server-verified session — it can no longer be freely toggled in the UI.
 */
export type { Role };

export interface RolePermissions {
  canGenerateAI: boolean;
  canEditText: boolean;
  canUploadMedia: boolean;
  canPublish: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  content: { canGenerateAI: true, canEditText: true, canUploadMedia: false, canPublish: false },
  media: { canGenerateAI: false, canEditText: false, canUploadMedia: true, canPublish: false },
  admin: { canGenerateAI: true, canEditText: true, canUploadMedia: true, canPublish: true },
};

const ALL_STATUSES: PostStatus[] = ["Draft", "Waiting Media", "Review Pending", "Approved"];

/** Statuses the given role is allowed to move TO from the current status. */
export function getAllowedTransitions(role: Role, current: PostStatus): PostStatus[] {
  if (role === "admin") return ALL_STATUSES.filter((status) => status !== current);
  if (role === "content") return current === "Draft" ? ["Waiting Media"] : [];
  return current === "Waiting Media" ? ["Review Pending"] : [];
}

interface SessionContextValue {
  user: SessionPayload;
  role: Role;
  permissions: RolePermissions;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ user, children }: { user: SessionPayload; children: ReactNode }) {
  return (
    <SessionContext.Provider value={{ user, role: user.role, permissions: ROLE_PERMISSIONS[user.role] }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within a SessionProvider");
  return context;
}
