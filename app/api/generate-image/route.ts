import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { resolveApiKey } from "@/app/lib/settings-store";

export const dynamic = "force-dynamic";

// Only the designer works with visuals.
const ALLOWED_ROLES = new Set(["media"]);

const XKIRO_BASE = "https://api.xkiro.com/v1";
const MODEL = "sensenova/sensenova-u1.5-lite";

interface JobResponse {
  id?: string;
  job_id?: string;
  jobId?: string;
  task_id?: string;
  status?: "queued" | "processing" | "succeeded" | "failed" | "blocked" | "cancelled";
  data?: { url?: string; b64_json?: string }[];
  result_url?: string;
  image_url?: string;
  output_url?: string;
  images?: string[];
  error?: string;
  message?: string;
}

/** Extract the job id regardless of which field name the API uses. */
function extractJobId(job: JobResponse): string | undefined {
  return job.id || job.job_id || job.jobId || job.task_id;
}

/** Extract the result image URL regardless of which field name the API uses. */
function extractImageUrl(job: JobResponse): string | undefined {
  return (
    job.data?.[0]?.url ||
    job.result_url ||
    job.image_url ||
    job.output_url ||
    (Array.isArray(job.images) ? job.images[0] : undefined)
  );
}

/** Extract an inline base64 image if the API returns one directly. */
function extractBase64(job: JobResponse): string | undefined {
  return job.data?.[0]?.b64_json;
}

async function requireImageRole() {
  const user = await getSessionUser();
  if (!user) return { error: "Authentication required.", status: 401 as const };
  if (!ALLOWED_ROLES.has(user.role)) return { error: "Chỉ designer được vẽ ảnh.", status: 403 as const };
  return { user };
}

async function xkiroKey() {
  const apiKey = await resolveApiKey("xkiroApiKey");
  return apiKey;
}

/**
 * POST /api/generate-image — submit an image job to xKiro
 * (sensenova/sensenova-u1.5-lite, free tier).
 * Body: { prompt: string }. Returns { jobId } immediately (202).
 * Poll GET /api/generate-image?jobId=... for the result — this keeps each
 * request well under Vercel's Hobby 60s limit.
 * Requires XKIRO_API_KEY (Settings UI or env).
 */
export async function POST(request: Request) {
  const auth = await requireImageRole();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const apiKey = await xkiroKey();
  if (!apiKey) {
    return NextResponse.json({ error: "XKIRO_API_KEY is not configured." }, { status: 500 });
  }

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const prompt = (body.prompt || "").trim();
  if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  if (prompt.length > 500) return NextResponse.json({ error: "Prompt too long (max 500 chars)." }, { status: 400 });

  try {
    const submit = await fetch(`${XKIRO_BASE}/images/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        prompt: `Ảnh minh họa vuông cho bài đăng Facebook của câu lạc bộ sinh viên Việt Nam: ${prompt}. Phong cách tươi sáng, năng động, hiện đại. Tuyệt đối không vẽ chữ, số hay logo lên ảnh.`,
        n: 1,
        size: "1024x1024",
      }),
    });
    if (!submit.ok) {
      const errText = await submit.text().catch(() => "");
      throw new Error(`Submit failed (HTTP ${submit.status}). ${errText.slice(0, 200)}`);
    }
    const submitted = (await submit.json()) as JobResponse;
    const newJobId = extractJobId(submitted);
    if (!newJobId) {
      console.error("generate-image: unexpected submit response", JSON.stringify(submitted).slice(0, 500));
      throw new Error("No job id returned.");
    }
    return NextResponse.json({ jobId: newJobId }, { status: 202 });
  } catch (error) {
    console.error("generate-image submit failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image generation failed." }, { status: 500 });
  }
}

/**
 * GET /api/generate-image?jobId=... — check a submitted job.
 * Returns { status: "processing" } while running, or
 * { status: "succeeded", imageDataUrl } / { status: "failed"|"blocked", error }.
 */
export async function GET(request: Request) {
  const auth = await requireImageRole();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const apiKey = await xkiroKey();
  if (!apiKey) {
    return NextResponse.json({ error: "XKIRO_API_KEY is not configured." }, { status: 500 });
  }

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId is required." }, { status: 400 });

  try {
    const res = await fetch(`${XKIRO_BASE}/images/generations/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Poll failed (HTTP ${res.status}).`);
    const job = (await res.json()) as JobResponse;

    if (job.status === "queued" || job.status === "processing" || !job.status) {
      return NextResponse.json({ status: "processing" });
    }
    if (job.status === "blocked") {
      return NextResponse.json({ status: "blocked", error: "Prompt bị từ chối. Hãy diễn đạt lại prompt khác." });
    }
    if (job.status === "failed" || job.status === "cancelled") {
      return NextResponse.json({ status: "failed", error: job.error || job.message || "Image generation failed." });
    }
    // succeeded — the API may return a URL or an inline base64 image
    const inline = extractBase64(job);
    if (inline) {
      return NextResponse.json({ status: "succeeded", imageDataUrl: `data:image/png;base64,${inline}` });
    }
    const url = extractImageUrl(job);
    if (!url) {
      console.error("generate-image: success without image", JSON.stringify(job).slice(0, 500));
      throw new Error("Job succeeded but returned no image URL.");
    }
    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error("Could not download the generated image.");
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    if (buffer.length > 8_000_000) throw new Error("Generated image too large.");
    const mime = imgRes.headers.get("content-type")?.split(";")[0] || "image/png";
    return NextResponse.json({ status: "succeeded", imageDataUrl: `data:${mime};base64,${buffer.toString("base64")}` });
  } catch (error) {
    console.error("generate-image poll failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image generation failed." }, { status: 500 });
  }
}
