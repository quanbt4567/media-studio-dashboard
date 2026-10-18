import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "msd_session";
// Routes anyone can reach without logging in.
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function loginUrl(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return url;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;

  if (!token || !secret) {
    return pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Authentication required." }, { status: 401 })
      : NextResponse.redirect(loginUrl(request));
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const role = payload.role as string | undefined;

    // Publishing is admin-only, enforced at the edge too.
    if (pathname.startsWith("/api/publish-facebook") && role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }
    const response = NextResponse.redirect(loginUrl(request));
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
