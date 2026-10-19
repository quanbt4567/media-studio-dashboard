import { readStore, writeStore } from "./storage";

export interface MediaItem {
  id: string;
  name: string;
  dataUrl: string;
  uploadedBy?: string;
  createdAt: string;
}

// Serialize writes to avoid concurrent read-modify-write data loss.
let writeQueue: Promise<unknown> = Promise.resolve();
function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => undefined);
  return run;
}

export async function readMedia(): Promise<MediaItem[]> {
  const items = await readStore<MediaItem[]>("media", []);
  return Array.isArray(items) ? items : [];
}

export async function addMedia(item: Omit<MediaItem, "id" | "createdAt">): Promise<MediaItem> {
  return enqueueWrite(async () => {
    const items = await readMedia();
    const created: MediaItem = {
      ...item,
      id: `media_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    items.unshift(created);
    await writeStore("media", items);
    return created;
  });
}

export async function deleteMedia(id: string): Promise<boolean> {
  return enqueueWrite(async () => {
    const items = await readMedia();
    const next = items.filter((m) => m.id !== id);
    if (next.length === items.length) return false;
    await writeStore("media", next);
    return true;
  });
}
