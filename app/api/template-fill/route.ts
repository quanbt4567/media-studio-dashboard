import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { geminiErrorMessage, withGeminiKeys } from "@/app/lib/gemini-errors";

/**
 * AI auto-fill for design templates ("AI điền nội dung"): extracts a short
 * headline + body from the post content, tailored to the template kind.
 * Only roles that design (media, admin) may call this.
 */

const KIND_HINTS: Record<string, string> = {
  "bcn-announce": "Đây là mẫu THÔNG BÁO.",
  "bcn-event": "Đây là mẫu SỰ KIỆN — body nên ưu tiên nêu rõ thời gian và địa điểm nếu bài post có nhắc.",
  "bcn-recap": "Đây là mẫu RECAP sau sự kiện — body nêu 1-2 điểm nổi bật.",
  "bcn-recruit": "Đây là mẫu TUYỂN THÀNH VIÊN — body nêu vị trí/quyền lợi và cách đăng ký, ngắn gọn.",
  "bcn-quote": "Đây là mẫu TRÍCH DẪN — headline là câu trích dẫn hay nhất trong bài (giữ nguyên văn), body là tên người nói (để trống nếu không rõ).",
  "bcn-modern": "Đây là mẫu hiện đại, nội dung ngắn gọn súc tích.",
};

function extractJson(raw: string): { headline: string; body: string } | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
      headline?: unknown;
      body?: unknown;
    };
    const headline = typeof parsed.headline === "string" ? parsed.headline.trim() : "";
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    if (!headline) return null;
    return { headline, body };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "media" && user.role !== "admin") {
    return NextResponse.json({ error: "Chỉ designer và admin dùng được tính năng này." }, { status: 403 });
  }

  let content = "";
  let kind = "";
  try {
    const body = await request.json();
    content = typeof body.content === "string" ? body.content.trim() : "";
    kind = typeof body.kind === "string" ? body.kind : "";
  } catch {
    return NextResponse.json({ error: "Request không hợp lệ." }, { status: 400 });
  }
  if (content.length < 10) {
    return NextResponse.json({ error: "Bài viết quá ngắn để AI trích xuất nội dung." }, { status: 400 });
  }
  if (content.length > 4000) content = content.slice(0, 4000);

  const kindHint = KIND_HINTS[kind] ?? "Đây là mẫu bài đăng chung.";

  try {
    const result = await withGeminiKeys(async (apiKey) => {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `Trích xuất nội dung cho mẫu thiết kế từ bài post Facebook sau.

${kindHint}

Yêu cầu:
- "headline": tiêu đề ngắn gọn, súc tích, tối đa 10 từ, KHÔNG emoji, KHÔNG hashtag, KHÔNG dấu ngoặc kép thừa.
- "body": 1-2 câu tóm tắt nội dung chính, tối đa 30 từ, KHÔNG emoji, KHÔNG hashtag.
- Viết hoa chữ đầu câu đúng chính tả tiếng Việt, giữ nguyên tên riêng.

Bài post:
"""${content}"""

Chỉ trả về JSON thuần (không markdown, không giải thích):
{"headline": "...", "body": "..."}`,
      });
      return response.text ?? "";
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const parsed = extractJson(result.value);
    if (!parsed) {
      return NextResponse.json(
        { error: "AI trả về nội dung không đúng định dạng, thử lại giúp mình." },
        { status: 502 },
      );
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("template-fill failed:", error);
    return NextResponse.json({ error: geminiErrorMessage(error) }, { status: 500 });
  }
}
