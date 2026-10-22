import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { geminiErrorMessage } from "@/app/lib/gemini-errors";
import { aiText } from "@/app/lib/text-ai";

/**
 * AI visual brief for the designer ("gợi ý visual"): given the writer's post
 * content, suggest what image the designer should add/shoot and which
 * built-in template fits best. Called by the writer in the handoff box.
 */

const TEMPLATES = [
  { id: "bcn-announce", name: "Thông báo", desc: "mọi loại thông báo chung" },
  { id: "bcn-event", name: "Sự kiện", desc: "workshop, họp mặt, ngoại khóa" },
  { id: "bcn-recap", name: "Recap", desc: "tổng kết sau sự kiện" },
  { id: "bcn-recruit", name: "Tuyển thành viên", desc: "tuyển quân, casting" },
  { id: "bcn-quote", name: "Trích dẫn", desc: "câu nói hay, cảm nghĩ" },
];
const TEMPLATE_IDS = new Set(TEMPLATES.map((t) => t.id));

function extractJson(raw: string): {
  imageBrief: string;
  templateId: string;
  templateReason: string;
} | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
      imageBrief?: unknown;
      templateId?: unknown;
      templateReason?: unknown;
    };
    const imageBrief = typeof parsed.imageBrief === "string" ? parsed.imageBrief.trim() : "";
    const templateReason = typeof parsed.templateReason === "string" ? parsed.templateReason.trim() : "";
    const templateId = typeof parsed.templateId === "string" ? parsed.templateId.trim() : "";
    if (!imageBrief || !TEMPLATE_IDS.has(templateId)) return null;
    return { imageBrief, templateId, templateReason };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "content") {
    return NextResponse.json({ error: "Chỉ writer dùng được tính năng này." }, { status: 403 });
  }

  let content = "";
  try {
    const body = await request.json();
    content = typeof body.content === "string" ? body.content.trim() : "";
  } catch {
    return NextResponse.json({ error: "Request không hợp lệ." }, { status: 400 });
  }
  if (content.length < 10) {
    return NextResponse.json({ error: "Bài viết quá ngắn để AI gợi ý visual." }, { status: 400 });
  }
  if (content.length > 4000) content = content.slice(0, 4000);

  const catalog = TEMPLATES.map((t) => `- ${t.id}: ${t.name} — ${t.desc}`).join("\n");

  try {
    const result = await aiText(`Bạn là art director cho Ban Công Nghệ (câu lạc bộ công nghệ sinh viên). Dựa vào bài post Facebook dưới đây, hãy gợi ý cho designer:

1. "imageBrief": mô tả cụ thể ảnh nên thêm/chụp cho bài này — gồm chủ thể chính, bố cục, cảm xúc/tone, và gợi ý màu sắc theo brand (xanh navy + vàng gold). 2-3 câu, tiếng Việt, thực tế (designer sinh viên tự chụp/làm được).
2. "templateId": chọn 1 mẫu phù hợp nhất trong danh sách (chỉ dùng đúng id).
3. "templateReason": 1 câu giải thích vì sao mẫu đó hợp.

Danh sách mẫu:
${catalog}

Bài post:
"""${content}"""

Chỉ trả về JSON thuần (không markdown, không giải thích):
{"imageBrief": "...", "templateId": "...", "templateReason": "..."}`);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const parsed = extractJson(result.value);
    if (!parsed) {
      return NextResponse.json(
        { error: "AI trả về gợi ý không đúng định dạng, thử lại giúp mình." },
        { status: 502 },
      );
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("visual-brief failed:", error);
    return NextResponse.json({ error: geminiErrorMessage(error) }, { status: 500 });
  }
}
