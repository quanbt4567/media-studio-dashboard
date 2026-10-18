import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";

/** Roles in the 3-actor workflow model. */
export type Role = "content" | "media" | "admin";

export interface AppUser {
  username: string;
  role: Role;
  /** Plain-text password (simple setup). Prefer passwordHash for better hygiene. */
  password?: string;
  /** Bcrypt hash (optional, more secure). Created with: npm run hash-password "pw" */
  passwordHash?: string;
}

export interface SessionPayload {
  username: string;
  role: Role;
}

const SESSION_COOKIE = "msd_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is not configured (min 16 characters).");
  }
  return new TextEncoder().encode(secret);
}

/** Users are defined via the AUTH_USERS env var as a JSON array. */
export function getUsers(): AppUser[] {
  const raw = process.env.AUTH_USERS;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is AppUser =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as AppUser).username === "string" &&
        (typeof (entry as AppUser).password === "string" ||
          typeof (entry as AppUser).passwordHash === "string") &&
        ["content", "media", "admin"].includes((entry as AppUser).role),
    );
  } catch {
    return [];
  }
}

export function findUser(username: string): AppUser | undefined {
  const normalized = username.trim().toLowerCase();
  return getUsers().find((user) => user.username.toLowerCase() === normalized);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}

/** Constant-time comparison for plain-text passwords. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Checks a login password against either a bcrypt hash or a plain-text password. */
export async function checkPassword(
  user: AppUser,
  password: string,
): Promise<boolean> {
  if (user.passwordHash) return verifyPassword(password, user.passwordHash);
  if (typeof user.password === "string")
    return safeEqual(password, user.password);
  return false;
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.username !== "string" ||
      !["content", "media", "admin"].includes(payload.role as Role)
    ) {
      return null;
    }
    return { username: payload.username, role: payload.role as Role };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export { SESSION_COOKIE, SESSION_MAX_AGE };
