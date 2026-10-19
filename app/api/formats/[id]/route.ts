import { NextResponse } from "next/server";
import { bumpFormatUse, deleteFormat, readFormats } from "@/app/lib/format-store";
import { createPost } from "@/app/lib/posts-store";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

/** DELETE /api/formats/[id] — remove a saved format (writer + admin). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "content" && user.role !== "admin") {
    return NextResponse.json({ error: "Your role cannot manage formats." }, { status: 403 });
  }
  const { id } = await params;
  const removed = await deleteFormat(id);
  if (!removed) {
    return NextResponse.json({ error: "Format not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

/** POST /api/formats/[id]/use — start a new draft from a saved format (writer only). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "content") {
    return NextResponse.json({ error: "Chỉ writer được tạo bài viết mới." }, { status: 403 });
  }
  const { id } = await params;
  const formats = await readFormats();
  const format = formats.find((f) => f.id === id);
  if (!format) {
    return NextResponse.json({ error: "Format not found." }, { status: 404 });
  }
  const post = await createPost({ content: format.content, createdBy: user.username });
  await bumpFormatUse(id);
  return NextResponse.json({ post }, { status: 201 });
}
