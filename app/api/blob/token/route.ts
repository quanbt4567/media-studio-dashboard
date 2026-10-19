import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/app/lib/session";
import { resolveApiKey } from "@/app/lib/settings-store";

export const dynamic = "force-dynamic";

/** Client-upload token endpoint for designer videos (Vercel Blob). */
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "media") {
    return NextResponse.json({ error: "Chỉ designer được upload video." }, { status: 403 });
  }
  const token = await resolveApiKey("blobToken");
  if (!token) {
    return NextResponse.json(
      { error: "Vercel Blob chưa được cấu hình. Admin vào tab Cài đặt để nhập Blob Token." },
      { status: 500 },
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      token,
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_VIDEO_TYPES,
        maximumSizeInBytes: MAX_VIDEO_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // The client saves the returned Blob URL onto the post itself.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start the video upload." },
      { status: 500 },
    );
  }
}
