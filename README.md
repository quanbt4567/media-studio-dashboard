# Clubhouse Media Desk

A responsive Next.js media management workspace for university clubs, with a server-side AI Facebook post generator powered by Google Gen AI.

## Run locally

1. Install Node.js 20+.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the values (see below).
4. Start the app with `npm run dev`.
5. Open `http://localhost:3000` and log in.

The browser calls `POST /api/generate`; the route uses `@google/genai` and the `gemini-3.1-flash-lite` model without exposing the API key to the client.

## Authentication

The app requires login. Accounts are defined in `.env.local` — there is no sign-up page.

1. Generate a secret (min 16 chars):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Put it in `AUTH_SECRET`.
2. Add users to `AUTH_USERS` as a JSON array on a single line. Roles: `content`, `media`, `admin`.
   ```env
   AUTH_USERS=[{"username":"admin","role":"admin","password":"admin123"},{"username":"designer","role":"media","password":"designer123"},{"username":"writer","role":"content","password":"writer123"}]
   ```
   (Tip: you can use `"passwordHash"` with a bcrypt hash instead of plain `"password"` — generate one with `npm run hash-password "pw"`.)

How it works:

- Login (`POST /api/auth/login`) verifies the bcrypt hash and sets an `httpOnly` JWT session cookie (7 days).
- `middleware.ts` redirects unauthenticated page visits to `/login`, returns 401 for API calls, and returns 403 when a non-admin hits `/api/publish-facebook`.
- The role comes from the verified session — it cannot be toggled in the UI.

## AI tone of voice

`GET /api/fetch-page-posts` returns the 5 most recent Fanpage posts. The `/api/generate` route feeds them to Gemini as few-shot examples so generated copy matches the page's tone (fails open if Facebook is unreachable).
"# media-studio-dashboard"
