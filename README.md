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
- `proxy.ts` redirects unauthenticated page visits to `/login` and returns 401 for API calls.
- The role comes from the verified session — it cannot be toggled in the UI.

## AI tone of voice

`GET /api/fetch-page-posts` returns the 5 most recent Fanpage posts. The `/api/generate` route feeds them to Gemini as few-shot examples so generated copy matches the page's tone (fails open if Facebook is unreachable).

## Content library (multiple posts)

Posts are stored server-side in `data/posts.json` (git-ignored) and shared across accounts:

- `GET /api/posts` — list all posts, `POST /api/posts` — create a draft (content/admin only)
- `GET/PUT/DELETE /api/posts/[id]` — field-level role checks: content edits text, media manages images, admin does everything; creators can delete their own drafts
- The Studio UI shows a post switcher — pick any post to continue working on it

## Template Studio

A canvas-based visual designer (1080×1080) for the media team, with 7 built-in templates
(Sunset Event, Clean Announcement, Bold Statement, Photo Story, Neon Recruitment, Quote of the Week, Celebration):
editable kicker/headline/subline, club logo lockup, optional background photo, PNG download,
and one-click "Save to post" which attaches the design as the post's image.

## Team review (replaces Zalo threads)

- `POST /api/posts/[id]/comments` — any logged-in member can discuss a draft right on the post
- `POST /api/posts/[id]/review` — admin one-click **Approve** (→ Approved) or **Send back** (→ Draft, note required)
- Every change is recorded in the post's activity timeline

## AI idea generator

The Ideas tab suggests post ideas around the club's event calendar (recruitment, 8/3, Christmas, Tet...).
`POST /api/ideas` returns 5 ideas with angles, hashtags and best posting times — one click turns an idea into a draft.

## Content calendar & auto-publish

- The Calendar tab shows scheduled/published posts on a month grid
- Set a date & time on any post (content/admin); approved posts go out automatically
- `POST /api/publish-due` publishes everything due — or hit "Publish due now" in the app.
  `GET` also works with the cron bearer token (that's what Vercel Cron sends);
  `vercel.json` already schedules it every 5 minutes — just set `CRON_SECRET` in env.
## Branding (your own logo)

1. Save your logo as a square image at `public/club-logo.png` (PNG or JPG).
2. Restart the dev server (`npm run dev`) or rebuild — the sidebar and login page
   will show your logo automatically. If the file is missing, the app falls back
   to an initial-letter badge.
3. Optionally set `NEXT_PUBLIC_CLUB_NAME` / `NEXT_PUBLIC_CLUB_TAGLINE` in
   `.env.local` to change the name next to the logo (rebuild after changing).

## Standout features

- **Shared media library** (`Thư viện` tab) — upload once, reuse across posts. `GET/POST/DELETE /api/media`
  (upload/delete: media/admin). Attach any library image to the active post from the Studio composer.
- **AI cover art** — the Template Studio has an "AI background" box: describe the scene and
  it draws it via xKiro (`sensenova/sensenova-u1.5-lite`, free tier — needs `XKIRO_API_KEY`
  from the xkiro.com console), then auto-saves to the shared library (`POST /api/generate-image`).
- **AI post scoring** — the "Chấm điểm AI" button grades the draft 0–100 (hook, CTA, length, hashtag, tone)
  with concrete fix suggestions (`POST /api/score`).
- **Analytics** (`Thống kê` tab) — real Facebook likes/comments/shares per published post, ranked by engagement,
  plus a "best hour to post" hint (`GET /api/analytics`; needs `FB_PAGE_ACCESS_TOKEN` for fresh numbers).

## Settings tab (admin only)

The `Cài đặt` tab lets an admin paste API keys once for the whole team — no redeploy needed:
Gemini key, xKiro key, Facebook Page ID + Page Access Token.
Keys are stored **encrypted** (AES-256-GCM, key derived from `AUTH_SECRET`) and the UI
only shows masked values. Resolution order everywhere: Settings value → `.env` fallback.

## Deploying to Vercel

1. Push this repo to GitHub, import it in Vercel.
2. Set env vars in the Vercel dashboard: `AUTH_SECRET`, `AUTH_USERS`, `GEMINI_API_KEY`
   (or paste it later in the Settings tab), `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`,
   `CRON_SECRET` (any random string, min 16 chars).
3. **Storage:** Vercel's filesystem is ephemeral — without extra setup, posts and images
   would vanish on every deploy. Create a KV database (Vercel Dashboard → Storage →
   Create Database → KV) and connect it to the project; the app auto-detects
   `KV_REST_API_URL` / `KV_REST_API_TOKEN` and stores posts, media and settings there.
   Local dev keeps using `data/*.json` files.
4. **Auto-publish cron:** `vercel.json` already schedules `GET /api/publish-due` every
   5 minutes. Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` —
   just make sure `CRON_SECRET` is set in env.
5. API keys can also be entered later in the admin Settings tab instead of env vars.
