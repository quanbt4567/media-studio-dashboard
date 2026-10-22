"use client";

import { ArrowDown, ArrowUp, BarChart3, ExternalLink, Lightbulb, MessageCircle, Minus, RefreshCw, Search, Share2, TrendingDown, TrendingUp, TriangleAlert, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CountUp } from "./fx/motion";

interface PostStats {
  id: string;
  snippet: string;
  publishedAt?: string;
  facebookPostId?: string;
  likes: number;
  reactions?: Record<string, number>;
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
  reactions?: Record<string, number>;
  comments: number;
  shares: number;
  engagement: number;
  picture?: string;
}

interface Row {
  key: string;
  fbId?: string;
  snippet: string;
  date?: string;
  reactions: number;
  reactionBreakdown?: Record<string, number>;
  comments: number;
  shares: number;
  engagement: number;
  picture?: string;
  hasPicture?: boolean;
}

const REACTION_EMOJI: Record<string, string> = {
  LIKE: "👍",
  LOVE: "❤️",
  WOW: "😮",
  HAHA: "😆",
  SAD: "😢",
  ANGRY: "😠",
};

function ReactionBreakdown({ reactions }: { reactions?: Record<string, number> }) {
  const entries = Object.entries(reactions ?? {}).filter(([, count]) => count > 0);
  if (entries.length === 0) return null;
  return (
    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-bold text-[var(--muted)]">
      {entries.map(([type, count]) => (
        <span key={type}>{REACTION_EMOJI[type] ?? "•"} {count}</span>
      ))}
    </p>
  );
}

type RangeKey = "7" | "28" | "90" | "all" | "custom";
type MetricKey = "engagement" | "reactions" | "comments" | "shares";
type SortKey = "engagement" | "reactions" | "comments" | "shares" | "date";

const METRIC_LABELS: Record<MetricKey, string> = {
  engagement: "Tổng tương tác",
  reactions: "Reactions",
  comments: "Bình luận",
  shares: "Chia sẻ",
};

const WEEKDAYS_VN = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

function fmt(n: number): string {
  return n.toLocaleString("vi-VN");
}

function Delta({ current, previous, hasPrevious }: { current: number; previous: number; hasPrevious: boolean }) {
  if (!hasPrevious) {
    return <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--faint)]" title="Chưa có dữ liệu kỳ trước để so sánh">— chưa có kỳ trước</span>;
  }
  if (previous === 0) {
    return current > 0
      ? <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--green-text)]"><TrendingUp size={12} /> mới phát sinh</span>
      : <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--faint)]"><Minus size={12} /> 0%</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: up ? "var(--green-text)" : "var(--danger-text)" }}>
      <Icon size={12} /> {up ? "+" : ""}{pct.toFixed(0)}% <span className="font-semibold text-[var(--faint)]">so với kỳ trước</span>
    </span>
  );
}

function TrendChart({ current, previous, labels }: { current: number[]; previous: number[]; labels: string[] }) {
  const W = 720;
  const H = 200;
  const PAD = 8;
  const max = Math.max(1, ...current, ...previous);
  const x = (i: number, n: number) => PAD + (n <= 1 ? (W - PAD * 2) / 2 : (i / (n - 1)) * (W - PAD * 2));
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const line = (series: number[]) => series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i, series.length).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = current.length > 0 ? `${line(current)} L${x(current.length - 1, current.length).toFixed(1)},${H - PAD} L${x(0, current.length).toFixed(1)},${H - PAD} Z` : "";
  const midLabel = labels.length > 2 ? labels[Math.floor(labels.length / 2)] : "";
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Biểu đồ xu hướng tương tác theo ngày đăng">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="var(--line)" strokeWidth="1" strokeDasharray="3 5" />
        ))}
        {previous.length > 0 && (
          <path d={line(previous)} fill="none" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
        )}
        {current.length > 0 && <path d={area} fill="var(--accent)" opacity="0.14" />}
        {current.length > 0 && (
          <path d={line(current)} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        )}
        {current.map((v, i) => (
          <circle key={i} cx={x(i, current.length)} cy={y(v)} r="7" fill="transparent">
            <title>{`${labels[i] ?? ""}: ${fmt(v)}`}</title>
          </circle>
        ))}
        {current.map((v, i) => (
          <circle key={`d${i}`} cx={x(i, current.length)} cy={y(v)} r="3" fill="var(--accent)" pointerEvents="none" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-[var(--faint)]">
        <span>{labels[0] ?? ""}</span>
        <span>{midLabel}</span>
        <span>{labels[labels.length - 1] ?? ""}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-bold text-[var(--muted)]">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded bg-[var(--accent)]" /> Kỳ này</span>
        {previous.length > 0 && <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded bg-[var(--line-strong)]" /> Kỳ trước (đường đứt)</span>}
        <span className="font-semibold text-[var(--faint)]">Mỗi điểm = tổng của các bài đăng trong ngày đó · di chuột lên điểm để xem số</span>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<PostStats[]>([]);
  const [page, setPage] = useState<PageInfo | null>(null);
  const [pagePosts, setPagePosts] = useState<PagePostStats[]>([]);
  const [facebookConfigured, setFacebookConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statsErrors, setStatsErrors] = useState<{ postId: string; error: string }[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [range, setRange] = useState<RangeKey>("28");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [metric, setMetric] = useState<MetricKey>("engagement");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("engagement");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [visibleCount, setVisibleCount] = useState(8);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load analytics.");
      setStats(data.stats || []);
      setStatsErrors(data.statsErrors || []);
      setFacebookConfigured(data.facebookConfigured !== false);
      setPage(data.page ?? null);
      setPagePosts(data.pagePosts || []);
      setLastRefresh(new Date());
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

  useEffect(() => {
    setVisibleCount(8);
  }, [range, query, sortKey, sortDir, customFrom, customTo]);

  // Unified, de-duplicated post rows: Page posts (rich: picture + shares)
  // absorb app-published posts with the same Facebook id.
  const rows = useMemo<Row[]>(() => {
    const byFbId = new Map<string, Row>();
    const out: Row[] = [];
    for (const p of pagePosts) {
      const row: Row = {
        key: `page:${p.id}`,
        fbId: p.id,
        snippet: p.snippet,
        date: p.createdAt,
        reactions: p.likes,
        reactionBreakdown: p.reactions,
        comments: p.comments,
        shares: p.shares,
        engagement: p.engagement,
        picture: p.picture,
        hasPicture: Boolean(p.picture),
      };
      byFbId.set(p.id, row);
      out.push(row);
    }
    for (const s of stats) {
      if (s.facebookPostId && byFbId.has(s.facebookPostId)) continue;
      out.push({
        key: `app:${s.id}`,
        fbId: s.facebookPostId,
        snippet: s.snippet,
        date: s.publishedAt,
        reactions: s.likes,
        reactionBreakdown: s.reactions,
        comments: s.comments,
        shares: s.shares,
        engagement: s.engagement,
        hasPicture: undefined,
      });
    }
    return out;
  }, [stats, pagePosts]);

  const { start, end, prevStart, periodLabel } = useMemo(() => {
    const now = new Date();
    if (range === "custom" && customFrom && customTo) {
      const s = new Date(`${customFrom}T00:00:00`);
      const e = new Date(`${customTo}T23:59:59`);
      const len = e.getTime() - s.getTime();
      return {
        start: s,
        end: e,
        prevStart: new Date(s.getTime() - len),
        periodLabel: `${s.toLocaleDateString("vi-VN")} – ${e.toLocaleDateString("vi-VN")}`,
      };
    }
    if (range === "all") {
      return { start: new Date(0), end: now, prevStart: new Date(0), periodLabel: "Toàn bộ thời gian có dữ liệu" };
    }
    const days = Number(range);
    const s = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      start: s,
      end: now,
      prevStart: new Date(s.getTime() - days * 24 * 60 * 60 * 1000),
      periodLabel: `${days} ngày gần nhất · ${s.toLocaleDateString("vi-VN")} – ${now.toLocaleDateString("vi-VN")}`,
    };
  }, [range, customFrom, customTo]);

  const inRange = useCallback(
    (r: Row, from: Date, to: Date) => {
      if (!r.date) return false;
      const t = new Date(r.date).getTime();
      return t >= from.getTime() && t <= to.getTime();
    },
    [],
  );

  const currentRows = useMemo(() => rows.filter((r) => inRange(r, start, end)), [rows, inRange, start, end]);
  const previousRows = useMemo(
    () => (range === "all" ? [] : rows.filter((r) => inRange(r, prevStart, start))),
    [rows, inRange, prevStart, start, range],
  );

  const sum = (list: Row[], pick: (r: Row) => number) => list.reduce((acc, r) => acc + pick(r), 0);
  const totals = {
    engagement: sum(currentRows, (r) => r.engagement),
    reactions: sum(currentRows, (r) => r.reactions),
    comments: sum(currentRows, (r) => r.comments),
    shares: sum(currentRows, (r) => r.shares),
    posts: currentRows.length,
  };
  const prevTotals = {
    engagement: sum(previousRows, (r) => r.engagement),
    reactions: sum(previousRows, (r) => r.reactions),
    comments: sum(previousRows, (r) => r.comments),
    shares: sum(previousRows, (r) => r.shares),
    posts: previousRows.length,
  };
  const hasPrevious = previousRows.length > 0;

  // Daily trend series (by publish date), current vs previous period.
  const { trendCurrent, trendPrevious, trendLabels } = useMemo(() => {
    const days = Math.max(1, Math.min(120, Math.ceil((end.getTime() - start.getTime()) / 86400000)));
    const cur = new Array<number>(days).fill(0);
    const prev = new Array<number>(days).fill(0);
    const labels: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      labels.push(d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }));
    }
    const bucket = (list: Row[], origin: Date, target: number[]) => {
      for (const r of list) {
        if (!r.date) continue;
        const idx = Math.floor((new Date(r.date).getTime() - origin.getTime()) / 86400000);
        if (idx >= 0 && idx < days) target[idx] += r[metric === "reactions" ? "reactions" : metric];
      }
    };
    bucket(currentRows, start, cur);
    if (range !== "all") bucket(previousRows, prevStart, prev);
    return { trendCurrent: cur, trendPrevious: range === "all" ? [] : prev, trendLabels: labels };
  }, [currentRows, previousRows, start, end, prevStart, metric, range]);

  // Publishing insights from real data only (guarded by sample size).
  const insights = useMemo(() => {
    const list: { title: string; body: string; evidence: string }[] = [];
    if (currentRows.length >= 3) {
      const byHour = new Map<number, { total: number; count: number }>();
      const byDay = new Map<number, { total: number; count: number }>();
      for (const r of currentRows) {
        if (!r.date) continue;
        const d = new Date(r.date);
        const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000);
        const h = vn.getUTCHours();
        const dow = vn.getUTCDay();
        const he = byHour.get(h) ?? { total: 0, count: 0 };
        he.total += r.engagement;
        he.count += 1;
        byHour.set(h, he);
        const de = byDay.get(dow) ?? { total: 0, count: 0 };
        de.total += r.engagement;
        de.count += 1;
        byDay.set(dow, de);
      }
      const bestOf = (m: Map<number, { total: number; count: number }>) =>
        [...m.entries()].map(([k, v]) => ({ k, avg: v.total / v.count, count: v.count })).sort((a, b) => b.avg - a.avg)[0];
      const bh = bestOf(byHour);
      if (bh && bh.count >= 2) {
        list.push({
          title: `Khung giờ hiệu quả nhất: ${bh.k}:00`,
          body: "Bài đăng trong khung giờ này đạt tương tác trung bình cao nhất trong kỳ.",
          evidence: `TB ${fmt(Math.round(bh.avg))} tương tác/bài · dựa trên ${bh.count} bài`,
        });
      }
      const bd = bestOf(byDay);
      if (bd && bd.count >= 2) {
        list.push({
          title: `Ngày đăng tốt nhất: ${WEEKDAYS_VN[bd.k]}`,
          body: "Bài đăng vào ngày này có tương tác trung bình cao nhất trong kỳ.",
          evidence: `TB ${fmt(Math.round(bd.avg))} tương tác/bài · dựa trên ${bd.count} bài`,
        });
      }
      const withPic = currentRows.filter((r) => r.hasPicture === true);
      const withoutPic = currentRows.filter((r) => r.hasPicture === false);
      if (withPic.length >= 2 && withoutPic.length >= 2) {
        const avg = (l: Row[]) => l.reduce((a, r) => a + r.engagement, 0) / l.length;
        const a = avg(withPic);
        const b = avg(withoutPic);
        list.push({
          title: a >= b ? "Bài có ảnh đang nhỉnh hơn" : "Bài không ảnh đang nhỉnh hơn",
          body: "So sánh tương tác trung bình giữa bài có ảnh bìa và bài không có ảnh bìa trong kỳ.",
          evidence: `Có ảnh: TB ${fmt(Math.round(a))} (${withPic.length} bài) · Không ảnh: TB ${fmt(Math.round(b))} (${withoutPic.length} bài)`,
        });
      }
    }
    return list;
  }, [currentRows]);

  const sortedRows = useMemo(() => {
    const filtered = query.trim()
      ? currentRows.filter((r) => r.snippet.toLowerCase().includes(query.trim().toLowerCase()))
      : [...currentRows];
    const get = (r: Row): number => {
      switch (sortKey) {
        case "date":
          return r.date ? new Date(r.date).getTime() : 0;
        case "reactions":
          return r.reactions;
        case "comments":
          return r.comments;
        case "shares":
          return r.shares;
        default:
          return r.engagement;
      }
    };
    filtered.sort((a, b) => (get(a) - get(b)) * sortDir);
    return filtered;
  }, [currentRows, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === -1 ? 1 : -1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const kpis: { label: string; value: number; delta?: React.ReactNode }[] = [
    { label: "Tổng tương tác", value: totals.engagement, delta: <Delta current={totals.engagement} previous={prevTotals.engagement} hasPrevious={hasPrevious} /> },
    { label: "Reactions", value: totals.reactions, delta: <Delta current={totals.reactions} previous={prevTotals.reactions} hasPrevious={hasPrevious} /> },
    { label: "Bình luận", value: totals.comments, delta: <Delta current={totals.comments} previous={prevTotals.comments} hasPrevious={hasPrevious} /> },
    { label: "Chia sẻ", value: totals.shares, delta: <Delta current={totals.shares} previous={prevTotals.shares} hasPrevious={hasPrevious} /> },
    { label: "Bài đã đăng trong kỳ", value: totals.posts, delta: <Delta current={totals.posts} previous={prevTotals.posts} hasPrevious={hasPrevious} /> },
  ];

  const breakdownMax = Math.max(1, totals.reactions, totals.comments, totals.shares);
  const breakdown = [
    { label: "Reactions", value: totals.reactions, color: "var(--accent)", share: totals.engagement > 0 ? (totals.reactions / (totals.reactions + totals.comments + totals.shares || 1)) * 100 : 0 },
    { label: "Bình luận", value: totals.comments, color: "var(--accent-2)", share: totals.engagement > 0 ? (totals.comments / (totals.reactions + totals.comments + totals.shares || 1)) * 100 : 0 },
    { label: "Chia sẻ", value: totals.shares, color: "var(--brand)", share: totals.engagement > 0 ? (totals.shares / (totals.reactions + totals.comments + totals.shares || 1)) * 100 : 0 },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-extrabold"><BarChart3 size={18} /> Performance Overview</h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Kỳ báo cáo: {periodLabel}
            {lastRefresh ? ` · Cập nhật lúc ${lastRefresh.toLocaleTimeString("vi-VN")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-[var(--line)] bg-[var(--surface)] p-0.5" role="group" aria-label="Chọn kỳ báo cáo">
            {(["7", "28", "90", "all"] as RangeKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setRange(k)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold ${range === k ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
              >
                {k === "all" ? "Tất cả" : `${k} ngày`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRange("custom")}
              className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold ${range === "custom" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
            >
              Tùy chọn
            </button>
          </div>
          {range === "custom" && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--muted)]">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-[var(--ink)]" aria-label="Từ ngày" />
              →
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-[var(--ink)]" aria-label="Đến ngày" />
            </span>
          )}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-extrabold text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      {!facebookConfigured && (
        <p className="mb-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--muted)]">
          Chưa cấu hình Page Access Token nên chỉ hiện số liệu đã lưu. Thêm key để kéo số liệu mới từ Facebook.
        </p>
      )}
      {error && <p className="mb-4 text-sm font-bold text-[var(--danger-text-2)]">{error}</p>}
      {statsErrors.length > 0 && (
        <div className="mb-4 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-tint)] px-4 py-3">
          {statsErrors.map((e) => (
            <p key={e.postId} className="text-xs font-bold leading-relaxed text-[var(--danger-text)]"><TriangleAlert size={13} className="mr-1 inline-block align-[-2px]" /> {e.error}</p>
          ))}
        </div>
      )}

      {loading && stats.length === 0 && pagePosts.length === 0 ? (
        <div className="space-y-3" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
          <div className="skeleton h-64 rounded-[20px]" />
          <div className="skeleton h-48 rounded-[20px]" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{k.label}</p>
                <p className="mt-1 text-2xl font-black"><CountUp value={k.value} /></p>
                <div className="mt-1">{k.delta}</div>
              </div>
            ))}
          </div>

          {page && (
            <p className="-mt-2 mb-5 text-[11px] font-semibold text-[var(--muted)]">
              Page <b className="text-[var(--ink)]">{page.name}</b>: {fmt(page.followers)} người theo dõi · {fmt(page.fanCount)} lượt thích (số hiện tại, không theo kỳ).
            </p>
          )}

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
              Chưa có dữ liệu bài đăng. Đăng bài đầu tiên rồi quay lại đây xem hiệu quả nhé.
            </div>
          ) : currentRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
              Không có bài nào trong kỳ đã chọn. Thử mở rộng kỳ báo cáo nhé.
            </div>
          ) : (
            <>
              {/* Trend + breakdown */}
              <div className="mb-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-black">Xu hướng theo ngày đăng</h4>
                    <div className="flex rounded-full border border-[var(--line)] p-0.5" role="group" aria-label="Chọn chỉ số biểu đồ">
                      {(Object.keys(METRIC_LABELS) as MetricKey[]).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setMetric(k)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${metric === k ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
                        >
                          {METRIC_LABELS[k]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <TrendChart current={trendCurrent} previous={trendPrevious} labels={trendLabels} />
                </section>

                <section className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <h4 className="mb-3 text-sm font-black">Cơ cấu tương tác</h4>
                  <div className="space-y-3.5">
                    {breakdown.map((b) => (
                      <div key={b.label}>
                        <div className="mb-1 flex items-baseline justify-between text-xs font-bold">
                          <span>{b.label}</span>
                          <span className="text-[var(--muted)]">{fmt(b.value)} · {b.share.toFixed(0)}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[var(--fill)]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((b.value / breakdownMax) * 100)}%`, background: b.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-[var(--faint)]">
                    Tổng tương tác = reactions + bình luận × 2 + chia sẻ × 3 (trọng số nhấn mạnh hành động lan truyền).
                  </p>
                </section>
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <section className="mb-5">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-black"><Lightbulb size={15} className="text-[var(--orange)]" /> Nhận định từ dữ liệu</h4>
                  <div className="grid gap-3 md:grid-cols-3">
                    {insights.map((ins) => (
                      <div key={ins.title} className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-4">
                        <p className="text-sm font-extrabold">{ins.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{ins.body}</p>
                        <p className="mt-2 text-[11px] font-bold text-[var(--accent-2)]">{ins.evidence}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {currentRows.length > 0 && currentRows.length < 3 && (
                <p className="mb-5 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--muted)]">
                  Chưa đủ bài trong kỳ (cần tối thiểu 3) để rút ra nhận định giờ/ngày đăng đáng tin cậy — app không kết luận khi dữ liệu quá ít.
                </p>
              )}

              {/* Ranking table */}
              <section className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-black">Xếp hạng bài đăng ({sortedRows.length})</h4>
                  <label className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5">
                    <Search size={13} className="text-[var(--muted)]" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Tìm theo nội dung bài…"
                      className="w-44 bg-transparent text-xs font-semibold text-[var(--ink)] outline-none placeholder:text-[var(--faint)]"
                      aria-label="Tìm bài đăng"
                    />
                  </label>
                </div>
                <div className="mb-2 hidden grid-cols-[minmax(0,1fr)_92px_92px_92px_110px] gap-3 border-b border-[var(--line)] pb-2 text-[11px] font-extrabold uppercase tracking-wide text-[var(--faint)] md:grid">
                  <span>Bài đăng</span>
                  {(
                    [
                      ["reactions", "Reactions"],
                      ["comments", "Bình luận"],
                      ["shares", "Chia sẻ"],
                      ["engagement", "Tương tác"],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => toggleSort(key)} className="flex items-center justify-end gap-1 text-right hover:text-[var(--ink)]" aria-label={`Sắp xếp theo ${label}`}>
                      {label}
                      {sortKey === key && (sortDir === -1 ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                    </button>
                  ))}
                </div>
                <div className="divide-y divide-[var(--line)]">
                  {sortedRows.slice(0, visibleCount).map((r, index) => (
                    <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 md:grid-cols-[minmax(0,1fr)_92px_92px_92px_110px]">
                      <div className="flex min-w-0 items-center gap-3">
                        {r.picture ? (
                          <img src={r.picture} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--fill)] text-sm font-black text-[var(--muted)]">
                            {index + 1}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-bold">
                            {sortKey === "engagement" && sortDir === -1 && index < 3 && !query && (
                              <span title={`Top ${index + 1}`}><Trophy size={14} className="text-[#b8860b]" /></span>
                            )}
                            <span className="truncate">{r.snippet}</span>
                            {r.fbId && (
                              <a
                                href={`https://www.facebook.com/${r.fbId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 text-[var(--faint)] hover:text-[var(--accent)]"
                                aria-label="Mở bài trên Facebook"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                            {r.date ? new Date(r.date).toLocaleString("vi-VN") : "—"}
                          </p>
                          <ReactionBreakdown reactions={r.reactionBreakdown} />
                          <p className="mt-1 flex gap-3 text-[11px] font-bold text-[var(--muted)] md:hidden">
                            <span>❤ {fmt(r.reactions)}</span>
                            <span className="flex items-center gap-1"><MessageCircle size={11} /> {fmt(r.comments)}</span>
                            <span className="flex items-center gap-1"><Share2 size={11} /> {fmt(r.shares)}</span>
                            <span className="text-[var(--ink)]">Σ {fmt(r.engagement)}</span>
                          </p>
                        </div>
                      </div>
                      <span className="hidden text-right text-xs font-bold md:block">{fmt(r.reactions)}</span>
                      <span className="hidden text-right text-xs font-bold md:block">{fmt(r.comments)}</span>
                      <span className="hidden text-right text-xs font-bold md:block">{fmt(r.shares)}</span>
                      <span className="hidden text-right text-xs font-black md:block">{fmt(r.engagement)}</span>
                      <span className="text-right text-xs font-black md:hidden">{fmt(r.engagement)}</span>
                    </div>
                  ))}
                </div>
                {sortedRows.length === 0 && (
                  <p className="py-6 text-center text-sm text-[var(--muted)]">Không tìm thấy bài nào khớp từ khóa.</p>
                )}
                {visibleCount < sortedRows.length && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 8)}
                    className="mt-3 w-full rounded-full border border-[var(--line)] py-2 text-xs font-extrabold hover:border-[var(--accent)]"
                  >
                    Xem thêm ({sortedRows.length - visibleCount} bài nữa)
                  </button>
                )}
                <div className="mt-3 flex gap-2 md:hidden">
                  {(["engagement", "reactions", "comments", "shares", "date"] as SortKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleSort(key)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${sortKey === key ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"}`}
                    >
                      {key === "engagement" ? "Tương tác" : key === "reactions" ? "Reactions" : key === "comments" ? "Bình luận" : key === "shares" ? "Chia sẻ" : "Ngày đăng"}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
