import { GoogleGenAI } from "@google/genai";
import { withGeminiKeys } from "./gemini-errors";
import { resolveApiKey } from "./settings-store";

/**
 * Text AI with automatic xKiro fallback.
 *
 * Every text-AI route (generate, ideas, score, template-fill, visual-brief)
 * goes through `aiText()`: Gemini first (with its built-in retries), and if
 * Gemini fails for any reason, the same prompt is sent to xKiro's
 * OpenAI-compatible chat endpoint using the team's existing xKiro key.
 * The text model is auto-discovered from xKiro's live catalog, preferring
 * small/cheap variants (flash-lite, haiku, mini...).
 */

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const XKIRO_BASE = process.env.XKIRO_BASE_URL || "https://api.xkiro.com/v1";

export interface AiTextOptions {
  /** Maps to Gemini systemInstruction / OpenAI system message. */
  system?: string;
  /** Ask for strict JSON output. */
  json?: boolean;
  maxTokens?: number;
}

interface XkiroModelEntry {
  id?: unknown;
}

let modelCache: { at: number; ids: string[] } | null = null;

async function xkiroModelIds(apiKey: string): Promise<string[]> {
  if (modelCache && Date.now() - modelCache.at < 3_600_000) return modelCache.ids;
  const res = await fetch(`${XKIRO_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`không lấy được danh sách model (HTTP ${res.status})`);
  const data = (await res.json()) as { data?: XkiroModelEntry[] };
  const ids = (data.data || [])
    .map((m) => m.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  modelCache = { at: Date.now(), ids };
  return ids;
}

/** Prefer small/cheap chat variants; fall back to the first model listed. */
function pickTextModel(ids: string[]): string | null {
  if (ids.length === 0) return null;
  const preference = [/flash-lite/i, /haiku/i, /\bmini\b/i, /flash/i, /\bair\b/i, /lite/i];
  for (const re of preference) {
    const hit = ids.find((id) => re.test(id));
    if (hit) return hit;
  }
  return ids[0];
}

async function xkiroText(prompt: string, opts: AiTextOptions, apiKey: string): Promise<string> {
  const model = pickTextModel(await xkiroModelIds(apiKey));
  if (!model) throw new Error("catalog rỗng, không có text model nào");
  const messages =
    opts.system && opts.system.trim()
      ? [
          { role: "system", content: opts.system },
          { role: "user", content: prompt },
        ]
      : [{ role: "user", content: prompt }];
  const res = await fetch(`${XKIRO_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: opts.maxTokens ?? 2000,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${body.slice(0, 150)}`.trim());
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("trả về nội dung rỗng");
  return text;
}

export async function aiText(
  prompt: string,
  opts: AiTextOptions = {},
): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  const gemini = await withGeminiKeys(async (apiKey) => {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        ...(opts.system ? { systemInstruction: opts.system } : {}),
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    });
    return response.text ?? "";
  });
  if (gemini.ok) return gemini;

  // Gemini failed (any reason, incl. missing key) → automatic xKiro fallback
  // using the same key the designer already uses for image generation.
  const xkiroKey = await resolveApiKey("xkiroApiKey");
  if (!xkiroKey) return gemini;
  try {
    const text = await xkiroText(prompt, opts, xkiroKey);
    return { ok: true, value: text };
  } catch (fallbackError) {
    let reason = fallbackError instanceof Error ? fallbackError.message : "lỗi không rõ";
    if (/fetch failed|ENOTFOUND|ECONNREFUSED/i.test(reason)) {
      reason = "không kết nối được tới xKiro, kiểm tra mạng hoặc key";
    }
    return { ok: false, error: `${gemini.error} (Dự phòng xKiro cũng lỗi: ${reason})` };
  }
}
