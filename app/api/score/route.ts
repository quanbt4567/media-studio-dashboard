import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSessionUser } from "@/app/lib/session";
import { withGeminiKeys } from "@/app/lib/gemini-errors";

export const dynamic = "force-dynamic";

export interface ScoreBreakdown {
  criterion: string;
  points: number;
  max: number;
  comment: string;
}

export interface ScoreResult {
  score: number;
  breakdown: ScoreBreakdown[];
  suggestions: string[];
}

/**
 * POST /api/score — have Gemini grade a Facebook draft (0–100) and suggest fixes.
 * Body: { content: string }. Returns { score, breakdown, suggestions }.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "content") {
    return NextResponse.json({ error: "Chỉ writer được dùng AI chấm điểm." }, { status: 403 });
  }

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const content = (body.content || "").trim();
  if (!content) return NextResponse.json({ error: "Content is required." }, { status: 400 });
  if (content.length > 5000) return NextResponse.json({ error: "Content too long." }, { status: 400 });

  const result = await withGeminiKeys(async (apiKey) => {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Bạn là giám khảo khó tính chuyên chấm bài đăng Facebook cho câu lạc bộ sinh viên Việt Nam.
Chấm bài viết sau trên thang 100 điểm theo các tiêu chí:
- hook (câu mở đầu có níu người đọc không): tối đa 30
- cta (kêu gọi hành động rõ ràng không): tối đa 25
- length (độ dài vừa phải cho Facebook, không quá dài/quá cụt): tối đa 20
- hashtag (đủ và đúng hashtag, không nhồi nhét): tối đa 15
- tone (giọng văn trẻ trung, gần gũi, đúng chất CLB sinh viên): tối đa 10
Trả về JSON thuần (không markdown, không giải thích ngoài JSON) với cấu trúc:
{"score": <tổng điểm 0-100>, "breakdown": [{"criterion": "hook", "points": <số>, "max": 30, "comment": "<nhận xét ngắn tiếng Việt>"}], "suggestions": ["<gợi ý sửa cụ thể 1>", "<gợi ý 2>", "<gợi ý 3>"]}
Bài viết cần chấm:
"""
${content}
"""`,
      config: { responseMimeType: "application/json" },
    });
    return (response.text || "").trim();
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(result.value) as ScoreResult;
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    return NextResponse.json({ score, breakdown: parsed.breakdown || [], suggestions: parsed.suggestions || [] });
  } catch {
    return NextResponse.json({ error: "The AI returned an unreadable response. Please try again." }, { status: 500 });
  }
}
