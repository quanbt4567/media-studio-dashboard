/**
 * Persistence layer for the app's JSON stores.
 *
 * Backend priority (first CONFIGURED backend wins, exclusively):
 * 1. Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) — one `msd_store`
 *    table (key text PK, value jsonb, updated_at timestamptz).
 *    Recommended for production. Uses the service_role key server-side only
 *    (bypasses RLS by design — never expose it to the browser).
 * 2. Vercel KV (KV_REST_API_URL + KV_REST_API_TOKEN) — legacy option.
 * 3. JSON files under data/ (local dev).
 *
 * Callers keep their existing read-modify-write + serialized-queue logic;
 * only the final read/write goes through here.
 */

export type StoreName = "posts" | "media" | "settings" | "formats" | "notifications" | "design-templates" | "chat" | "prefs";

const SUPABASE_TABLE = "msd_store";

function useSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const useKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

function kvKey(name: StoreName): string {
  return `msd:${name}`;
}

async function getSupabase() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readSupabase<T>(name: StoreName): Promise<T | null> {
  const sb = await getSupabase();
  const { data, error } = await sb.from(SUPABASE_TABLE).select("value").eq("key", name).maybeSingle();
  if (error) throw error;
  return (data?.value as T) ?? null;
}

async function writeSupabase(name: StoreName, value: unknown): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb
    .from(SUPABASE_TABLE)
    .upsert(
      { key: name, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw error;
}

async function getKv() {
  const { kv } = await import("@vercel/kv");
  return kv;
}

async function readFileStore<T>(name: StoreName): Promise<T | null> {
  try {
    const { promises: fs } = await import("fs");
    const { default: path } = await import("path");
    const raw = await fs.readFile(path.join(process.cwd(), "data", `${name}.json`), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Read a store. Returns `fallback` when the store doesn't exist yet. */
export async function readStore<T>(name: StoreName, fallback: T): Promise<T> {
  if (useSupabase()) {
    try {
      const val = await readSupabase<T>(name);
      return val === null ? fallback : val;
    } catch (error) {
      console.error(`Supabase read failed for ${name}:`, error);
      return fallback;
    }
  }
  if (useKv) {
    try {
      const val = await (await getKv()).get<T>(kvKey(name));
      return val === null || val === undefined ? fallback : val;
    } catch (error) {
      console.error(`KV read failed for ${name}:`, error);
      return fallback;
    }
  }
  const val = await readFileStore<T>(name);
  return val === null ? fallback : val;
}

/** Write a store (overwrites the whole value). */
export async function writeStore(name: StoreName, value: unknown): Promise<void> {
  if (useSupabase()) {
    await writeSupabase(name, value);
    return;
  }
  if (useKv) {
    await (await getKv()).set(kvKey(name), value);
    return;
  }
  const { promises: fs } = await import("fs");
  const { default: path } = await import("path");
  const dir = path.join(process.cwd(), "data");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${name}.json`), JSON.stringify(value));
}

/**
 * One-shot read of a legacy local file (used for one-time migrations).
 * Always reads from disk, even when a cloud backend is active.
 */
export async function readLegacyFile<T>(fileName: string): Promise<T | null> {
  try {
    const { promises: fs } = await import("fs");
    const { default: path } = await import("path");
    const raw = await fs.readFile(path.join(process.cwd(), "data", fileName), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** True when running against Supabase (useful for diagnostics). */
export function isSupabaseActive(): boolean {
  return useSupabase();
}

/** True when running against Vercel KV (useful for diagnostics). */
export function isKvActive(): boolean {
  return useKv;
}
