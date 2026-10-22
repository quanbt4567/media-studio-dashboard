import { NextResponse } from "next/server";
import { addMedia, deleteMedia, readMedia } from "@/app/lib/media-store";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

const UPLOAD_ROLES = new Set(["media"]);

/** GET /api/media — list the shared image library (any logged-in user). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const items = await readMedia();
  return NextResponse.json({ items });
}

/** POST /api/media — upload an image to the shared library (designer only). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!UPLOAD_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Chỉ designer được thêm ảnh vào thư viện." }, { status: 403 });
  }

  let body: { name?: string; dataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const dataUrl = (body.dataUrl || "").trim();
  if (!dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "dataUrl must be a data:image/* URL." }, { status: 400 });
  }
  // SVG can carry scripts — the library only needs raster images.
  if (/^data:image\/svg\+xml/i.test(dataUrl)) {
    return NextResponse.json({ error: "SVG không được hỗ trợ — hãy dùng PNG/JPG/WebP." }, { status: 400 });
  }
  if (dataUrl.length > 8_000_000) {
    return NextResponse.json({ error: "Image too large (max ~6MB)." }, { status: 400 });
  }

  const item = await addMedia({
    name: (body.name || "Untitled").slice(0, 120),
    dataUrl,
    uploadedBy: user.username,
  });
  return NextResponse.json({ item }, { status: 201 });
}

/** DELETE /api/media?id=... — remove an image (designer only). */
export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!UPLOAD_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Chỉ designer được xóa ảnh trong thư viện." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id") || "";
  const ok = await deleteMedia(id);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
