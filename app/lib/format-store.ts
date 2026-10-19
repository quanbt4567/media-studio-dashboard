import { readStore, writeStore } from "./storage";

/**
 * Saved post formats ("mẫu bài viết").
 * Every time a writer sends a finished draft out of Draft status, its content
 * is auto-saved here (deduplicated), so recurring formats — weekly meeting
 * announcements, event recaps — can be reused with one click.
 */

export interface PostFormat {
  id: string;
  name: string;
  content: string;
  createdBy: string;
  createdAt: string;
  useCount: number;
}

function generateId(): string {
  return `fmt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(content: string): string {
  return content.replace(/\s+/g, " ").trim();
}

export async function readFormats(): Promise<PostFormat[]> {
  const formats = await readStore<PostFormat[]>("formats", []);
  return formats.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Save a format. Returns null when an identical format already exists
 * (no duplicate clutter from re-sending the same post).
 */
export async function saveFormat(input: {
  name: string;
  content: string;
  createdBy: string;
}): Promise<PostFormat | null> {
  const content = normalize(input.content);
  if (!content) return null;
  const formats = await readFormats();
  if (formats.some((f) => normalize(f.content) === content)) return null;
  const format: PostFormat = {
    id: generateId(),
    name: input.name.trim() || content.slice(0, 40),
    content: input.content.trim(),
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    useCount: 0,
  };
  await writeStore("formats", [format, ...formats]);
  return format;
}

export async function bumpFormatUse(id: string): Promise<void> {
  const formats = await readFormats();
  const index = formats.findIndex((f) => f.id === id);
  if (index === -1) return;
  formats[index] = { ...formats[index], useCount: formats[index].useCount + 1 };
  await writeStore("formats", formats);
}

export async function deleteFormat(id: string): Promise<boolean> {
  const formats = await readFormats();
  const next = formats.filter((f) => f.id !== id);
  if (next.length === formats.length) return false;
  await writeStore("formats", next);
  return true;
}
