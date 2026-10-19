import type { Role } from "./roles";
import type { PostStatus } from "../components/post-status-switcher";
import { readLegacyFile, readStore, writeStore } from "./storage";

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Serialize all write operations so concurrent requests can't interleave
 * read-modify-write cycles and lose updates.
 */
let writeQueue: Promise<void> = Promise.resolve();
function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** A comment on a post — the in-app replacement for Zalo threads. */
export interface PostComment {
  id: string;
  author: string;
  role: Role;
  text: string;
  createdAt: string;
}

/** One entry in a post's activity timeline. */
export interface ActivityEntry {
  id: string;
  at: string;
  by: string;
  action: string;
}

export interface ReviewDecision {
  decision: "approved" | "rejected";
  by: string;
  at: string;
  note: string;
  /** Who a rejected post was sent back to. */
  sendBackTo?: "writer" | "designer";
}

/** A single post in the content library. */
export interface Post {
  id: string;
  content: string;
  imageDataUrl?: string;
  imageName?: string;
  /** Public video URL (Vercel Blob) attached by the designer. */
  videoUrl?: string;
  videoName?: string;
  /**
   * True when the writer sent this post straight to the admin, skipping the
   * designer lane (text-only post). Exempts the visual gates.
   */
  visualSkipped?: boolean;
  status: PostStatus;
  /** When the post should go out (ISO datetime). Set by content/admin. */
  scheduledAt?: string;
  /** When the 1-hour-before reminder was sent (ISO datetime). */
  reminderSentAt?: string;
  /** When the post was actually published (ISO datetime). */
  publishedAt?: string;
  /** Facebook post id returned by the Graph API. */
  facebookPostId?: string;
  /** Last-fetched Facebook engagement numbers. */
  metrics?: { likes: number; comments: number; shares: number; updatedAt: string };
  comments: PostComment[];
  activity: ActivityEntry[];
  review?: ReviewDecision;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

/** One-time migration from the old single-ticket format. */
async function migrateLegacyTicket(): Promise<Post[]> {
  const ticket = await readLegacyFile<Partial<Post> & { updatedBy?: string }>("ticket.json");
  if (!ticket) return [];
  try {
    const now = new Date().toISOString();
    const post: Post = {
      id: newId(),
      content: ticket.content || "",
      imageDataUrl: ticket.imageDataUrl,
      imageName: ticket.imageName,
      status: (ticket.status as PostStatus) || "Draft",
      comments: [],
      activity: [],
      createdBy: ticket.updatedBy || "system",
      updatedBy: ticket.updatedBy || "system",
      createdAt: now,
      updatedAt: now,
    };
    await writePostsFile([post]);
    return [post];
  } catch {
    return [];
  }
}

async function writePostsFile(posts: Post[]): Promise<void> {
  await writeStore("posts", posts);
}

async function readPostsFile(): Promise<Post[]> {
  const posts = await readStore<Post[] | null>("posts", null);
  if (posts) return Array.isArray(posts) ? posts : [];
  return migrateLegacyTicket();
}

/** Normalize older posts that predate newer fields. */
function normalize(post: Post): Post {
  return {
    ...post,
    comments: Array.isArray(post.comments) ? post.comments : [],
    activity: Array.isArray(post.activity) ? post.activity : [],
  };
}

export async function readPosts(): Promise<Post[]> {
  return (await readPostsFile()).map(normalize);
}

export async function getPost(id: string): Promise<Post | undefined> {
  const found = (await readPostsFile()).find((post) => post.id === id);
  return found ? normalize(found) : undefined;
}

function addActivity(post: Post, by: string, action: string): void {
  post.activity.unshift({
    id: newId(),
    at: new Date().toISOString(),
    by,
    action,
  });
  // Keep the timeline bounded.
  post.activity = post.activity.slice(0, 100);
}

export async function createPost(input: { content?: string; createdBy: string }): Promise<Post> {
  return enqueueWrite(async () => {
    const now = new Date().toISOString();
    const post: Post = {
      id: newId(),
      content: input.content || "",
      status: "Draft",
      comments: [],
      activity: [],
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    addActivity(post, input.createdBy, "created the post");
    const posts = await readPostsFile();
    posts.unshift(post);
    await writePostsFile(posts);
    return normalize(post);
  });
}

export interface PostUpdate {
  content?: string;
  imageDataUrl?: string;
  imageName?: string;
  /** Public video URL (Vercel Blob) attached by the designer. */
  videoUrl?: string;
  videoName?: string;
  clearVideo?: boolean;
  /** Writer-only: send straight to admin, skipping the designer lane. */
  visualSkipped?: boolean;
  status?: PostStatus;
  clearImage?: boolean;
  scheduledAt?: string;
  clearScheduledAt?: boolean;
  reminderSentAt?: string;
  publishedAt?: string;
  facebookPostId?: string;
  metrics?: { likes: number; comments: number; shares: number; updatedAt: string };
  review?: ReviewDecision;
  /** Human-readable description appended to the activity timeline. */
  activityAction?: string;
}

export async function updatePost(
  id: string,
  patch: PostUpdate,
  updatedBy: string,
): Promise<Post | undefined> {
  return enqueueWrite(async () => {
    const posts = await readPostsFile();
    const index = posts.findIndex((post) => post.id === id);
    if (index === -1) return undefined;
    const current = normalize(posts[index]);
    const next: Post = { ...current, updatedBy, updatedAt: new Date().toISOString() };
    if (patch.content !== undefined) next.content = patch.content;
    if (patch.status !== undefined) next.status = patch.status;
    if (patch.clearImage) {
      delete next.imageDataUrl;
      delete next.imageName;
    } else {
      if (patch.imageDataUrl !== undefined) next.imageDataUrl = patch.imageDataUrl;
      if (patch.imageName !== undefined) next.imageName = patch.imageName;
    }
    if (patch.clearVideo) {
      delete next.videoUrl;
      delete next.videoName;
    } else {
      if (patch.videoUrl !== undefined) next.videoUrl = patch.videoUrl;
      if (patch.videoName !== undefined) next.videoName = patch.videoName;
    }
    if (patch.visualSkipped !== undefined) next.visualSkipped = patch.visualSkipped;
    if (patch.clearScheduledAt) {
      delete next.scheduledAt;
    } else if (patch.scheduledAt !== undefined) {
      next.scheduledAt = patch.scheduledAt;
    }
    if (patch.publishedAt !== undefined) next.publishedAt = patch.publishedAt;
    if (patch.facebookPostId !== undefined) next.facebookPostId = patch.facebookPostId;
    if (patch.reminderSentAt !== undefined) next.reminderSentAt = patch.reminderSentAt;
    if (patch.metrics !== undefined) next.metrics = patch.metrics;
    if (patch.review !== undefined) next.review = patch.review;
    addActivity(next, updatedBy, patch.activityAction || "updated the post");
    posts[index] = next;
    await writePostsFile(posts);
    return normalize(next);
  });
}

export async function addComment(
  id: string,
  comment: { author: string; role: Role; text: string },
): Promise<Post | undefined> {
  return enqueueWrite(async () => {
    const posts = await readPostsFile();
    const index = posts.findIndex((post) => post.id === id);
    if (index === -1) return undefined;
    const current = normalize(posts[index]);
    const entry: PostComment = {
      id: newId(),
      author: comment.author,
      role: comment.role,
      text: comment.text,
      createdAt: new Date().toISOString(),
    };
    const next: Post = {
      ...current,
      comments: [...current.comments, entry],
      updatedBy: comment.author,
      updatedAt: new Date().toISOString(),
    };
    addActivity(next, comment.author, "added a comment");
    posts[index] = next;
    await writePostsFile(posts);
    return normalize(next);
  });
}

export async function deletePost(id: string): Promise<boolean> {
  return enqueueWrite(async () => {
    const posts = await readPostsFile();
    const filtered = posts.filter((post) => post.id !== id);
    if (filtered.length === posts.length) return false;
    await writePostsFile(filtered);
    return true;
  });
}
