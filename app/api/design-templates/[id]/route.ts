import { NextResponse } from "next/server";
import { bumpDesignTemplateUse, deleteDesignTemplate } from "@/app/lib/design-template-store";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

/** DELETE /api/design-templates/[id] — designer + admin only. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "media" && user.role !== "admin") {
    return NextResponse.json({ error: "Chỉ designer được xóa mẫu thiết kế." }, { status: 403 });
  }
  const { id } = await params;
  const removed = await deleteDesignTemplate(id);
  if (!removed) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

/** POST /api/design-templates/[id] — count one use (returns the template). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const template = await bumpDesignTemplateUse(id);
  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
  return NextResponse.json({ template });
}
