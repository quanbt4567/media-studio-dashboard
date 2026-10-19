import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { geminiErrorMessage } from "@/app/lib/gemini-errors";
import { aiText } from "@/app/lib/text-ai";

export const dynamic = "force-dynamic";

export interface ContentIdea {
  title: string;
  angle: string;
  hashtags: string[];
  bestTime: string;
}

const EVENT_PRESETS: Record<string, string> = {
  "recruitment": "tuyển thành viên mới cho CLB",
  "workshop": "workshop kỹ năng cho sinh viên",
  "women-day": "ngày Quốc tế Phụ nữ 8/3",
  "vietnam-women-day": "ngày Phụ nữ Việt Nam 20/10",
  "christmas": "Giáng sinh",
  "lunar-new-year": "Tết Nguyên Đán",
  "teachers-day": "ngày Nhà giáo Việt Nam 20/11",
  "mid-autumn": "Tết Trung thu",
  "team-building": "team building / dã ngoại CLB",
  "anniversary": "kỷ niệm thành lập CLB",
  "exam-season": "mùa thi cử (tiếp sức mùa thi)",
  "back-to-school": "đầu năm học mới",
};

/** GET /api/ideas — list available event presets. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  return NextResponse.json({
    presets: Object.entries(EVENT_PRESETS).map(([id, label]) => ({ id, label })),
  });
}

/**
 * POST /api/ideas — generate content ideas for an event with Gemini.
 * Body: { eventId?: string, customTopic?: string }
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "content") {
    return NextResponse.json({ error: "Chỉ writer được dùng AI gợi ý ý tưởng." }, { status: 403 });
  }

  let eventId = "";
  let customTopic = "";
  try {
    const body = (await request.json()) as { eventId?: unknown; customTopic?: unknown };
    if (typeof body.eventId === "string") eventId = body.eventId;
    if (typeof body.customTopic === "string") customTopic = body.customTopic.trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const eventLabel = EVENT_PRESETS[eventId];
  const topic = eventLabel || customTopic;
  if (!topic) {
    return NextResponse.json({ error: "Pick an event or describe a custom topic." }, { status: 400 });
  }
  if (customTopic.length > 200) {
    return NextResponse.json({ error: "Custom topic is too long (max 200 characters)." }, { status: 400 });
  }

  const result = await aiText(
      `You are a social media strategist for a Vietnamese university student club. Suggest 5 Facebook post ideas for: "${topic}".`,
      {
        system: `Return ONLY a valid JSON array (no markdown fences, no commentary) of exactly 5 objects with these fields:
- "title": short catchy post title in Vietnamese (max 60 chars)
- "angle": one-sentence creative angle in Vietnamese (max 140 chars)
- "hashtags": array of 3 relevant hashtags (with # prefix)
- "bestTime": suggested posting slot, e.g. "19:00–21:00" or "Sáng 8:00"
Make ideas varied: announcement, behind-the-scenes, interactive (poll/question), member spotlight, countdown/reminder. Keep the tone youthful and warm. Never use ** markdown in any field.`,
      },
    );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  try {
    const raw = result.value;
    const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let ideas: ContentIdea[];
    try {
      ideas = JSON.parse(jsonText) as ContentIdea[];
    } catch {
      throw new Error("The AI returned an unreadable response. Please try again.");
    }
    if (!Array.isArray(ideas) || ideas.length === 0) {
      throw new Error("The AI returned an unreadable response. Please try again.");
    }
    const cleaned = ideas.slice(0, 5).map((idea) => ({
      title: String(idea.title || "").slice(0, 80),
      angle: String(idea.angle || "").slice(0, 200),
      hashtags: Array.isArray(idea.hashtags) ? idea.hashtags.slice(0, 4).map((h) => String(h).slice(0, 30)) : [],
      bestTime: String(idea.bestTime || "").slice(0, 40),
    }));
    return NextResponse.json({ ideas: cleaned, topic });
  } catch (error) {
    console.error("Idea parse failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate ideas right now." },
      { status: 500 },
    );
  }
}
