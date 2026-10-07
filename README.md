# Clubhouse Media Desk

A responsive Next.js media management workspace for university clubs, with a server-side AI Facebook post generator powered by Google Gen AI.

## Run locally

1. Install Node.js 20+.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and add your `GEMINI_API_KEY`.
4. Start the app with `npm run dev`.
5. Open `http://localhost:3000`.

The browser calls `POST /api/generate`; the route uses `@google/genai` and the `gemini-3.1-flash-lite` model without exposing the API key to the client.
"# media-studio-dashboard" 
