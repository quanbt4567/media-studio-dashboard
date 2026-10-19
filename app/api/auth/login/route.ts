import { NextResponse } from "next/server";
import {
  checkPassword,
  createSessionToken,
  findUser,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/app/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const cleanUsername = typeof username === "string" ? username.trim() : "";
    const cleanPassword = typeof password === "string" ? password : "";

    if (!cleanUsername || !cleanPassword) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    const user = findUser(cleanUsername);
    const valid = user ? await checkPassword(user, cleanPassword) : false;

    if (!user || !valid) {
      // Same response whether the user exists or not — don't leak usernames.
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const token = await createSessionToken({ username: user.username, role: user.role });
    const response = NextResponse.json({ username: user.username, role: user.role });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Login is not available right now." }, { status: 500 });
  }
}
