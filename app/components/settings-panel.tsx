"use client";

import { KeyRound, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface FieldState {
  configured: boolean;
  masked: string | null;
  fromEnv: boolean;
}

type SettingsMap = Record<string, FieldState>;

const FIELDS: { key: string; label: string; hint: string; placeholder: string }[] = [
  {
    key: "geminiApiKey",
    label: "Gemini API Key",
    hint: "Dùng cho: viết bài AI, gợi ý ý tưởng, chấm điểm bài viết.",
    placeholder: "Dán key mới vào đây (để trống = giữ nguyên)",
  },
  {
    key: "xkiroApiKey",
    label: "xKiro API Key",
    hint: "Dùng cho: vẽ ảnh bìa AI (sensenova-u1.5-lite). Lấy key tại xkiro.com → API Keys.",
    placeholder: "Dán key mới vào đây (để trống = giữ nguyên)",
  },
  {
    key: "fbPageId",
    label: "Facebook Page ID",
    hint: "ID của Fanpage sẽ đăng bài.",
    placeholder: "vd: 1275747727792769",
  },
  {
    key: "fbPageAccessToken",
    label: "Facebook Page Access Token",
    hint: "Token của Page (cần quyền pages_manage_posts). Dùng để đăng bài + đọc thống kê.",
    placeholder: "Dán token mới vào đây (để trống = giữ nguyên)",
  },
  {
    key: "blobToken",
    label: "Vercel Blob Token",
    hint: "Dùng cho: designer upload video (lưu trên Vercel Blob rồi đăng lên Facebook). Tạo Blob Store trên Vercel → copy Read-Write Token. Hoặc đặt BLOB_READ_WRITE_TOKEN trong env.",
    placeholder: "Dán token mới vào đây (để trống = giữ nguyên)",
  },
];

/**
 * Admin-only settings: paste API keys once for the whole team.
 * Values are stored encrypted server-side; the UI only ever sees masked versions.
 */
export default function SettingsPanel() {
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải được cài đặt.");
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được cài đặt.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- intentional initial data load */
    load();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const body: Record<string, string> = {};
      for (const f of FIELDS) {
        if (inputs[f.key]?.trim()) body[f.key] = inputs[f.key].trim();
      }
      if (Object.keys(body).length === 0) throw new Error("Chưa nhập key nào mới.");
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu thất bại.");
      setSettings(data.settings);
      setInputs({});
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-[var(--glass-border)] bg-[var(--glass)] p-4 shadow-[0_24px_80px_rgba(0,0,0,.12)] backdrop-blur-2xl sm:p-7">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]">
          <KeyRound size={14} />
        </span>
        <span className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[var(--muted)]">
          API keys · chỉ admin
        </span>
      </div>
      <h2 className="text-2xl font-black tracking-[-.05em]">Cài đặt API</h2>
      <p className="mt-1 max-w-lg text-xs leading-relaxed text-[var(--muted)]">
        Nhập key một lần cho cả team — web sẽ dùng ngay, không cần deploy lại.
        Key được mã hóa khi lưu, giao diện chỉ hiện dạng rút gọn.
        Nếu bỏ trống, web dùng key trong <code>.env.local</code> (nếu có).
      </p>

      {loading ? (
        <p className="py-8 text-center text-xs text-[var(--muted)]">Đang tải...</p>
      ) : (
        <div className="mt-6 space-y-4">
          {FIELDS.map((field) => {
            const state = settings?.[field.key];
            return (
              <div key={field.key} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <label htmlFor={`setting-${field.key}`} className="text-xs font-extrabold">
                    {field.label}
                  </label>
                  {state?.configured && (
                    <span className="rounded-full bg-[var(--green-tint)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--green-text)]">
                      ✓ đã cấu hình
                    </span>
                  )}
                  {state?.fromEnv && (
                    <span className="rounded-full bg-[var(--fill)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">
                      từ .env
                    </span>
                  )}
                  {state?.masked && (
                    <code className="font-mono text-[10px] text-[var(--muted)]">{state.masked}</code>
                  )}
                </div>
                <p className="mb-2 text-[11px] text-[var(--muted)]">{field.hint}</p>
                <input
                  id={`setting-${field.key}`}
                  type="password"
                  autoComplete="off"
                  value={inputs[field.key] || ""}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 font-mono text-xs outline-none transition placeholder:text-[var(--faint)] focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
            );
          })}

          {error && <p className="rounded-lg bg-[var(--danger-tint)] px-3 py-2 text-xs font-bold text-[var(--danger-text-2)]">{error}</p>}
          {saved && <p className="rounded-lg bg-[var(--green-tint)] px-3 py-2 text-xs font-bold text-[var(--green-text)]">Đã lưu. Các tính năng sẽ dùng key mới ngay lập tức.</p>}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              {saving && <LoaderCircle size={14} className="animate-spin" />}
              {saving ? "Đang lưu..." : "Lưu cài đặt"}
            </button>
            <p className="text-[11px] text-[var(--muted)]">Để trống ô nào = giữ nguyên key cũ của ô đó.</p>
          </div>
        </div>
      )}
    </div>
  );
}
