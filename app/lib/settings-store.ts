import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { readStore, writeStore } from "./storage";

/**
 * Admin-configured API keys, stored encrypted at rest.
 *
 * The user asked for this instead of .env-only configuration: an admin can
 * paste keys into the Settings UI and the app uses them immediately, no
 * redeploy needed. Values are encrypted with AES-256-GCM using a key derived
 * from AUTH_SECRET, so a stolen database dump alone doesn't expose them.
 *
 * Resolution order everywhere: Settings UI value → process.env fallback.
 * The full values NEVER leave the server; the UI only sees masked versions.
 */

export interface AppSettings {
  geminiApiKey?: string;
  xkiroApiKey?: string;
  fbPageId?: string;
  fbPageAccessToken?: string;
  /** Vercel Blob read-write token, for designer video uploads. */
  blobToken?: string;
}

export type SettingKey = keyof AppSettings;

const ENV_FALLBACK: Record<SettingKey, string | undefined> = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  xkiroApiKey: process.env.XKIRO_API_KEY,
  fbPageId: process.env.FB_PAGE_ID,
  fbPageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN,
  blobToken: process.env.BLOB_READ_WRITE_TOKEN,
};

function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is not configured (min 16 characters).");
  }
  return scryptSync(secret, "msd-settings", 32);
}

interface EncryptedBlob {
  iv: string;
  tag: string;
  data: string;
}

function encrypt(plaintext: string): EncryptedBlob {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

function decrypt(blob: EncryptedBlob): string {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(blob.data, "base64")), decipher.final()]).toString("utf8");
}

async function readEncrypted(): Promise<AppSettings> {
  const blob = await readStore<EncryptedBlob | null>("settings", null);
  if (!blob) return {};
  try {
    return JSON.parse(decrypt(blob)) as AppSettings;
  } catch (error) {
    console.error("Failed to decrypt settings (AUTH_SECRET may have changed):", error);
    return {};
  }
}

/** Full settings (decrypted). Server-side only — never send to the client. */
export async function getSettings(): Promise<AppSettings> {
  return readEncrypted();
}

/** Merge partial settings and persist encrypted. Empty strings clear a key. */
export async function saveSettings(partial: Partial<AppSettings>): Promise<void> {
  const current = await readEncrypted();
  const next: AppSettings = { ...current };
  (Object.keys(partial) as SettingKey[]).forEach((key) => {
    const value = (partial[key] || "").trim();
    if (value) next[key] = value;
    else delete next[key];
  });
  await writeStore("settings", encrypt(JSON.stringify(next)));
}

function mask(value: string): string {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}

/** Masked view for the Settings UI: shows which keys exist without revealing them. */
export async function getPublicSettings(): Promise<Record<SettingKey, { configured: boolean; masked: string | null; fromEnv: boolean }>> {
  const stored = await readEncrypted();
  const result = {} as Record<SettingKey, { configured: boolean; masked: string | null; fromEnv: boolean }>;
  (Object.keys(ENV_FALLBACK) as SettingKey[]).forEach((key) => {
    const storedValue = stored[key];
    const envValue = ENV_FALLBACK[key];
    const effective = storedValue || envValue || "";
    result[key] = {
      configured: Boolean(effective),
      masked: effective ? mask(effective) : null,
      fromEnv: !storedValue && Boolean(envValue),
    };
  });
  return result;
}

/**
 * Resolve one API key: Settings UI value first, then .env fallback.
 * Use this in every API route instead of reading process.env directly.
 */
export async function resolveApiKey(key: SettingKey): Promise<string | undefined> {
  const stored = await readEncrypted();
  return stored[key] || ENV_FALLBACK[key] || undefined;
}

/**
 * All candidate keys for a setting: Settings UI value first, then .env fallback.
 * Used to retry with the next key when the first one is rejected by the API —
 * the local .env stays a working safety net.
 */
export async function resolveApiKeyCandidates(key: SettingKey): Promise<string[]> {
  const stored = await readEncrypted();
  const candidates: string[] = [];
  const fromSettings = (stored[key] || "").trim();
  const fromEnv = (ENV_FALLBACK[key] || "").trim();
  if (fromSettings) candidates.push(fromSettings);
  if (fromEnv && fromEnv !== fromSettings) candidates.push(fromEnv);
  return candidates;
}
