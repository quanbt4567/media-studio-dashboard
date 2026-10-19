import { readStore, writeStore } from "./storage";

/**
 * Saved design templates ("mẫu thiết kế"): a reusable canvas layout —
 * background + positioned text/image elements with placeholder content.
 * The manager's workflow: designer builds the structure once, then each
 * activity just swaps the text and images, no new structure needed.
 */

export interface CanvasElement {
  id: string;
  type: "text" | "image";
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  fontFamily?: string;
  src?: string;
  /** Corner radius (px, at 1080 canvas scale) for image elements. */
  radius?: number;
  /**
   * Semantic slot for AI auto-fill ("AI điền nội dung"): which template text
   * this element holds. Only built-in templates set this; the filler replaces
   * placeholder text ([...]) in headline/body slots from the post content.
   */
  role?: "kicker" | "headline" | "body";
}

export type DesignBg = { kind: "gradient"; from: string; to: string } | { kind: "image"; src: string };

export interface DesignTemplate {
  id: string;
  name: string;
  bg: DesignBg;
  elements: CanvasElement[];
  /** Small JPEG preview rendered at save time. */
  thumbnail?: string;
  createdBy: string;
  createdAt: string;
  useCount: number;
}

function uid(): string {
  return `dtpl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function readDesignTemplates(): Promise<DesignTemplate[]> {
  const list = await readStore<DesignTemplate[]>("design-templates", []);
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveDesignTemplate(input: {
  name: string;
  bg: DesignBg;
  elements: CanvasElement[];
  thumbnail?: string;
  createdBy: string;
}): Promise<DesignTemplate> {
  const list = await readDesignTemplates();
  const tpl: DesignTemplate = {
    id: uid(),
    name: input.name.trim() || "Mẫu không tên",
    bg: input.bg,
    elements: input.elements,
    thumbnail: input.thumbnail,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    useCount: 0,
  };
  await writeStore("design-templates", [tpl, ...list]);
  return tpl;
}

export async function bumpDesignTemplateUse(id: string): Promise<DesignTemplate | null> {
  const list = await readDesignTemplates();
  const index = list.findIndex((t) => t.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], useCount: list[index].useCount + 1 };
  await writeStore("design-templates", list);
  return list[index];
}

export async function deleteDesignTemplate(id: string): Promise<boolean> {
  const list = await readDesignTemplates();
  const next = list.filter((t) => t.id !== id);
  if (next.length === list.length) return false;
  await writeStore("design-templates", next);
  return true;
}
