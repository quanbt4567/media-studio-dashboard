/**
 * Translate Gemini API errors into plain Vietnamese messages the team can act on.
 * The @google/genai SDK throws errors carrying an HTTP `status` when the API
 * rejects the call — surface the actionable ones instead of a generic 500.
 */
import { resolveApiKeyCandidates } from "./settings-store";

/** Short, key-safe detail for the fallback message so the team can report the real cause. */
function describeRaw(error: unknown): string {
  const status =
    typeof error === "object" && error !== null
      ? (error as { status?: number }).status
      : undefined;
  let raw = error instanceof Error ? error.message : String(error ?? "");
  // Never leak key-like tokens into a user-facing message.
  raw = raw.replace(/[A-Za-z0-9_\-]{24,}/g, "<da-an>");
  const detail = status ? `mã lỗi ${status}` : raw.slice(0, 120).trim();
  return detail ? ` (${detail})` : "";
}

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
  if (status === 503) {
    return "Gemini đang quá tải (503). Đợi 1-2 phút rồi thử lại.";
  }
  if (/fetch failed|network|ENOTFOUND|ECONNREFUSED/i.test(raw)) {
    return "Không kết nối được tới Gemini. Kiểm tra mạng rồi thử lại.";
  }
  return `Không gọi được Gemini lúc này${describeRaw(error)}. Thử lại sau ít phút.`;
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

/** Statuses worth retrying with a short backoff (transient, not auth). */
const RETRYABLE_STATUS = new Set([429, 503]);

function statusOf(error: unknown): number | undefined {
  return typeof error === "object" && error !== null
    ? (error as { status?: number }).status
    : undefined;
}

/**
 * Run a Gemini call with the Settings key first, automatically retrying once
 * with the .env key if the first key is rejected. Transient 429/503 errors
 * are retried with backoff before giving up. Returns the translated
 * Vietnamese error message on failure.
 */
const GEMINI_ATTEMPT_TIMEOUT_MS = 20000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Gemini không phản hồi sau ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function withGeminiKeys<T>(
  fn: (apiKey: string) => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  const candidates = await resolveApiKeyCandidates("geminiApiKey");
  if (candidates.length === 0) {
    return { ok: false, error: GEMINI_KEY_MISSING };
  }
  let lastError: unknown = null;
  for (const apiKey of candidates) {
    // Up to 2 attempts per key for transient overload/rate-limit errors.
    // Each attempt has its own timeout so a hanging call fails fast instead
    // of blocking the UI for a minute.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return { ok: true, value: await withTimeout(fn(apiKey), GEMINI_ATTEMPT_TIMEOUT_MS) };
      } catch (error) {
        lastError = error;
        const status = statusOf(error);
        if (status !== undefined && RETRYABLE_STATUS.has(status) && attempt < 1) {
          await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
          continue;
        }
        break;
      }
    }
    // Only auth rejections are worth retrying with the next key.
    if (!isGeminiAuthError(lastError)) break;
  }
  return { ok: false, error: geminiErrorMessage(lastError) };
}
