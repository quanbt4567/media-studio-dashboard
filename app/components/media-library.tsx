"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/app/lib/media-store";
import { useSession } from "../../context/SessionContext";

interface MediaLibraryProps {
  /** When set, clicking an image picks it instead of previewing. */
  onPick?: (item: MediaItem) => void;
  /** Notify parent after upload/delete so other views can refresh. */
  onChanged?: () => void;
}

export default function MediaLibrary({ onPick, onChanged }: MediaLibraryProps) {
  const { role } = useSession();
  const canManage = role === "media" || role === "admin";
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/media");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load library.");
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- intentional initial data load */
    load();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [load]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setItems((prev) => [data.item, ...prev]);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Xóa ảnh này khỏi thư viện dùng chung?")) return;
    const res = await fetch(`/api/media?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((m) => m.id !== id));
      onChanged?.();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Delete failed.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm text-[var(--muted)]">
          Ảnh upload một lần, cả team tái sử dụng cho nhiều bài — không cần gửi qua lại nữa.
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading ? "Đang tải..." : "Thêm ảnh"}
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading ? (
        <p className="text-sm text-[var(--muted)]">Đang tải thư viện...</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
          Thư viện trống. {canManage ? "Bấm “Thêm ảnh” để upload ảnh đầu tiên." : "Nhờ team Media upload ảnh nhé."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] ${onPick ? "cursor-pointer hover:ring-2 hover:ring-[var(--brand)]" : ""}`}
              onClick={() => onPick?.(item)}
              title={onPick ? "Bấm để chọn ảnh này" : item.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.dataUrl} alt={item.name} className="aspect-square w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                <p className="truncate text-xs font-medium text-white">{item.name}</p>
                {item.uploadedBy && <p className="text-[10px] text-white/70">bởi {item.uploadedBy}</p>}
              </div>
              {canManage && !onPick && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-0 group-hover:opacity-100 transition"
                  title="Xóa ảnh"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
