/**
 * Translate Gemini API errors into plain Vietnamese messages the team can act on.
 * The @google/genai SDK throws errors carrying an HTTP `status` when the API
 * rejects the call — surface the actionable ones instead of a generic 500.
 */
import { resolveApiKeyCandidates } from "./settings-store";

export function geminiErrorMessage(error: unknown): string {
  const status =
    typeof error === "object" && error !== null
      ? (error as { status?: number }).status
      : undefined;
  const raw = error instanceof Error ? error.message : "";

  if (status === 400) {
    return "Gemini từ chối request (API key sai hoặc model không đúng). Admin kiểm tra lại key trong tab Cài đặt.";
  }
  if (status === 401 || status === 403) {
    return "Gemini API key không hợp lệ hoặc đã bị vô hiệu hóa. Admin kiểm tra lại trong tab Cài đặt.";
  }
  if (status === 404) {
    return "Không tìm thấy model Gemini yêu cầu. Liên hệ admin để kiểm tra cấu hình.";
  }
  if (status === 429) {
    return "Đã hết quota Gemini miễn phí. Đợi vài phút rồi thử lại.";
  }
  if (/fetch failed|network|ENOTFOUND|ECONNREFUSED/i.test(raw)) {
    return "Không kết nối được tới Gemini. Kiểm tra mạng rồi thử lại.";
  }
  return "Không gọi được Gemini lúc này. Thử lại sau ít phút.";
}

/** Message shown when no Gemini key exists in Settings or env. */
export const GEMINI_KEY_MISSING =
  "Chưa cấu hình Gemini API key. Admin vào tab Cài đặt để nhập key (lấy miễn phí tại aistudio.google.com).";

/** True when the error means "this key is rejected" — worth retrying with the next candidate key. */
export function isGeminiAuthError(error: unknown): boolean {
  const status =
    typeof error === "object" && error !== null
      ? (error as { status?: number }).status
      : undefined;
  return status === 400 || status === 401 || status === 403;
}

/**
 * Run a Gemini call with the Settings key first, automatically retrying once
 * with the .env key if the first key is rejected. Returns the translated
 * Vietnamese error message on failure.
 */
export async function withGeminiKeys<T>(
  fn: (apiKey: string) => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  const candidates = await resolveApiKeyCandidates("geminiApiKey");
  if (candidates.length === 0) {
    return { ok: false, error: GEMINI_KEY_MISSING };
  }
  let lastError: unknown = null;
  for (const apiKey of candidates) {
    try {
      return { ok: true, value: await fn(apiKey) };
    } catch (error) {
      lastError = error;
      // Only auth rejections are worth retrying with the next key.
      if (!isGeminiAuthError(error)) break;
    }
  }
  return { ok: false, error: geminiErrorMessage(lastError) };
}
