import { readStore, writeStore } from "./storage";

/**
 * Non-secret team preferences (currently: the club's Brand Voice profile).
 * Stored through the same storage layer as everything else (Supabase / KV /
 * local JSON), under the "prefs" key.
 */
export interface Prefs {
  /** Free-text writing guidelines injected into AI generation prompts. */
  brandVoice?: string;
}

let writeQueue: Promise<unknown> = Promise.resolve();
function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function getPrefs(): Promise<Prefs> {
  return readStore<Prefs>("prefs", {});
}

export async function getBrandVoice(): Promise<string> {
  const prefs = await getPrefs();
  return (prefs.brandVoice ?? "").trim();
}

export async function setBrandVoice(brandVoice: string): Promise<Prefs> {
  return enqueueWrite(async () => {
    const prefs = await getPrefs();
    const next: Prefs = { ...prefs, brandVoice: brandVoice.trim().slice(0, 1000) || undefined };
    await writeStore("prefs", next);
    return next;
  });
}
