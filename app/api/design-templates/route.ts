import { NextResponse } from "next/server";
import {
  readDesignTemplates,
  saveDesignTemplate,
  type CanvasElement,
  type DesignBg,
} from "@/app/lib/design-template-store";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/design-templates — list saved design templates. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const templates = await readDesignTemplates();
  return NextResponse.json({ templates });
}

/**
 * POST /api/design-templates — save the current canvas as a template.
 * Body: { name, bg, elements, thumbnail? }. Designer + admin only.
 * Image data URLs inside bg/elements should already be compressed client-side.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "media" && user.role !== "admin") {
    return NextResponse.json({ error: "Chỉ designer được lưu mẫu thiết kế." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const { name, bg, elements, thumbnail } = body as {
    name?: string;
    bg?: DesignBg;
    elements?: CanvasElement[];
    thumbnail?: string;
  };
  if (!bg || !Array.isArray(elements) || elements.length === 0) {
    return NextResponse.json({ error: "Mẫu thiết kế cần có nền và ít nhất một lớp." }, { status: 400 });
  }
  // Cap payload size: template JSON must stay well under the API body limit.
  const approxBytes = JSON.stringify({ bg, elements }).length;
  if (approxBytes > 4 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Mẫu quá nặng (ảnh chưa nén). Hãy dùng ảnh nhỏ hơn." },
      { status: 400 },
    );
  }
  const template = await saveDesignTemplate({
    name: typeof name === "string" ? name : "Mẫu không tên",
    bg,
    elements,
    thumbnail: typeof thumbnail === "string" ? thumbnail : undefined,
    createdBy: user.username,
  });
  return NextResponse.json({ template }, { status: 201 });
}
