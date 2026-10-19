"use client";

import { createContext, useContext, type ReactNode } from "react";
import { ROLE_PERMISSIONS, getAllowedTransitions, type Role, type RolePermissions } from "../app/lib/roles";
import type { SessionPayload } from "../app/lib/auth";

/**
 * Session-based auth context. The role comes from the logged-in user's
 * server-verified session — it can no longer be freely toggled in the UI.
 */
export type { Role, RolePermissions };
export { ROLE_PERMISSIONS, getAllowedTransitions };

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
