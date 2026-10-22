import { NextResponse } from "next/server";
import {
  checkPassword,
  createSessionToken,
  findUser,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/app/lib/auth";
import { clearFailures, rateLimitRetryAfter, recordFailure } from "@/app/lib/rate-limit";

/** Brute-force guard: max failed logins per window, per IP+username and per IP. */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_USER = 10;
const MAX_FAILS_PER_IP = 30;

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const cleanUsername = typeof username === "string" ? username.trim() : "";
    const cleanPassword = typeof password === "string" ? password : "";

    if (!cleanUsername || !cleanPassword) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    const userKey = `login:${ip}:${cleanUsername.toLowerCase()}`;
    const ipKey = `login:${ip}`;
    const retryAfterMs = Math.max(
      rateLimitRetryAfter(userKey, MAX_FAILS_PER_USER),
      rateLimitRetryAfter(ipKey, MAX_FAILS_PER_IP),
    );
    if (retryAfterMs > 0) {
      return NextResponse.json(
        { error: "Too many failed login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
      );
    }

    const user = findUser(cleanUsername);
    const valid = user ? await checkPassword(user, cleanPassword) : false;

    if (!user || !valid) {
      recordFailure(userKey, LOGIN_WINDOW_MS);
      recordFailure(ipKey, LOGIN_WINDOW_MS);
      // Same response whether the user exists or not — don't leak usernames.
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    clearFailures(userKey);
    const token = await createSessionToken({ username: user.username, role: user.role });
    const response = NextResponse.json({ username: user.username, role: user.role });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Login is not available right now." }, { status: 500 });
  }
}
