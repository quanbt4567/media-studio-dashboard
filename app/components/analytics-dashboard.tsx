"use client";

import { BarChart3, FileText, Heart, MessageCircle, RefreshCw, Share2, TriangleAlert, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CountUp } from "./fx/motion";

interface PostStats {
  id: string;
  snippet: string;
  publishedAt?: string;
  facebookPostId?: string;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  metricsUpdatedAt?: string;
}

interface PageInfo {
  name: string;
  followers: number;
  fanCount: number;
}

interface PagePostStats {
  id: string;
  snippet: string;
  createdAt?: string;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  picture?: string;
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<PostStats[]>([]);
  const [bestHour, setBestHour] = useState<number | null>(null);
  const [totalPublished, setTotalPublished] = useState(0);
  const [facebookConfigured, setFacebookConfigured] = useState(true);
  const [page, setPage] = useState<PageInfo | null>(null);
  const [pagePosts, setPagePosts] = useState<PagePostStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statsErrors, setStatsErrors] = useState<{ postId: string; error: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load analytics.");
      setStats(data.stats || []);
      setStatsErrors(data.statsErrors || []);
      setBestHour(data.bestHour ?? null);
      setTotalPublished(data.totalPublished || 0);
      setFacebookConfigured(data.facebookConfigured !== false);
      setPage(data.page ?? null);
      setPagePosts(data.pagePosts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- intentional initial data load */
    load();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [load]);

  const maxEngagement = Math.max(1, ...stats.map((s) => s.engagement));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-extrabold"><BarChart3 size={18} /> Hiệu quả bài đăng</h3>
          <p className="text-xs text-[var(--muted)]">Số liệu thật từ Facebook — biết bài nào ăn khách, giờ nào đăng tốt.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-extrabold text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
      </div>

      {!facebookConfigured && (
        <p className="mb-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--muted)]">
          Chưa cấu hình <code>FB_PAGE_ACCESS_TOKEN</code> nên chỉ hiện số liệu đã lưu. Thêm key để kéo số liệu mới từ Facebook.
        </p>
      )}
      {error && <p className="mb-4 text-sm font-bold text-[#f0957e]">{error}</p>}
      {statsErrors.length > 0 && (
        <div className="mb-4 rounded-xl border border-[#5c2b28] bg-[#2b1a1e] px-4 py-3">
          {statsErrors.map((e) => (
            <p key={e.postId} className="text-xs font-bold leading-relaxed text-[#f28b82]"><TriangleAlert size={13} className="mr-1 inline-block align-[-2px]" /> {e.error}</p>
          ))}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Đã đăng (qua app)</p>
          <p className="text-2xl font-black"><CountUp value={totalPublished} /></p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Tổng tương tác</p>
          <p className="text-2xl font-black"><CountUp value={stats.reduce((sum, s) => sum + s.engagement, 0)} /></p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Giờ vàng đăng bài</p>
          <p className="text-2xl font-black">{bestHour !== null ? `${bestHour}:00` : "—"}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Người theo dõi Page</p>
          <p className="text-2xl font-black">{page ? <CountUp value={page.followers} /> : "—"}</p>
          {page && <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{page.name} · {page.fanCount.toLocaleString("vi-VN")} lượt thích</p>}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Đang tải số liệu...</p>
      ) : stats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
          Chưa có bài nào được đăng qua app. Đăng bài đầu tiên rồi quay lại đây xem hiệu quả nhé.
        </div>
      ) : (
        <div className="space-y-3">
          {stats.map((s, index) => (
            <div key={s.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    {index === 0 && <span title="Bài hiệu quả nhất"><Trophy size={14} className="text-[#b8860b]" /></span>}
                    <span className="truncate">{s.snippet}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {s.publishedAt ? new Date(s.publishedAt).toLocaleString("vi-VN") : "—"}
                    {s.metricsUpdatedAt ? ` · cập nhật số liệu ${new Date(s.metricsUpdatedAt).toLocaleString("vi-VN")}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1"><Heart size={13} className="text-pink-500" />{s.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={13} className="text-sky-500" />{s.comments}</span>
                  <span className="flex items-center gap-1"><Share2 size={13} className="text-emerald-500" />{s.shares}</span>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--fill)]">
                <div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: `${Math.round((s.engagement / maxEngagement) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent posts directly on the Page (whatever published them) */}
      {pagePosts.length > 0 && (
        <div className="mt-8">
          <h4 className="mb-1 text-sm font-black">Bài mới nhất trên Page</h4>
          <p className="mb-3 text-xs text-[var(--muted)]">Số liệu thật từ Facebook — kể cả bài đăng trực tiếp ngoài app.</p>
          <div className="space-y-3">
            {pagePosts.slice(0, 10).map((p, index) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
                {p.picture ? (
                  <img src={p.picture} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--fill)]"><FileText size={20} className="text-[var(--muted)]" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-bold">
                    {index === 0 && <span title="Bài hiệu quả nhất"><Trophy size={14} className="text-[#b8860b]" /></span>}
                    <span className="truncate">{p.snippet}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {p.createdAt ? new Date(p.createdAt).toLocaleString("vi-VN") : "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1"><Heart size={13} className="text-pink-500" />{p.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={13} className="text-sky-500" />{p.comments}</span>
                  <span className="flex items-center gap-1"><Share2 size={13} className="text-emerald-500" />{p.shares}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
