/**
 * Persistence layer for the app's JSON stores.
 *
 * - On Vercel (KV_REST_API_URL + KV_REST_API_TOKEN set): uses Vercel KV (Redis),
 *   because the serverless filesystem is ephemeral and local JSON files would
 *   be wiped on every deploy/instance recycle.
 * - Everywhere else (local dev, VPS): uses JSON files under data/, exactly as before.
 *
 * Callers keep their existing read-modify-write + serialized-queue logic;
 * only the final read/write goes through here.
 */

export type StoreName = "posts" | "media" | "settings" | "formats" | "notifications" | "design-templates";

const useKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

function kvKey(name: StoreName): string {
  return `msd:${name}`;
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
 * Always reads from disk, even when KV is active.
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

/** True when running against Vercel KV (useful for diagnostics). */
export function isKvActive(): boolean {
  return useKv;
}
