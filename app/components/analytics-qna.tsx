"use client";

import { BarChart3, Lightbulb, MessageCircleQuestion } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * "Hỏi đáp số liệu" — answers preset questions using ONLY the analytics
 * data already loaded on this page (no extra API calls, no invented
 * numbers). Every answer cites the figures it is based on, and questions
 * whose data is insufficient say so instead of guessing.
 */
interface QnA {
  q: string;
  a: string;
}

export default function AnalyticsQnA({
  current,
  previous,
  hasPrevious,
}: {
  current: { snippet: string; engagement: number; reactions: number; comments: number; shares: number; date?: string; hasPicture?: boolean }[];
  previous: { engagement: number }[];
  hasPrevious: boolean;
}) {
  const [selected, setSelected] = useState(0);

  const answers = useMemo<QnA[]>(() => {
    const out: QnA[] = [];
    const fmt = (n: number) => n.toLocaleString("vi-VN");
    const sum = <T,>(list: T[], pick: (r: T) => number) => list.reduce((a, r) => a + pick(r), 0);

    // 1. Best post
    if (current.length > 0) {
      const top = [...current].sort((a, b) => b.engagement - a.engagement)[0];
      out.push({
        q: "Bài nào hiệu quả nhất kỳ này?",
        a: `“${top.snippet}” — ${fmt(top.engagement)} tương tác (❤ ${fmt(top.reactions)} · 💬 ${fmt(top.comments)} · ↗ ${fmt(top.shares)})${top.date ? `, đăng ${new Date(top.date).toLocaleDateString("vi-VN")}` : ""}. Đây là bài cao nhất trong ${current.length} bài của kỳ.`,
      });
    } else {
      out.push({ q: "Bài nào hiệu quả nhất kỳ này?", a: "Kỳ này chưa có bài đăng nào có số liệu — hãy đổi kỳ báo cáo rộng hơn." });
    }

    // 2. Format comparison (picture vs no picture, only rows with known flag)
    const withPic = current.filter((r) => r.hasPicture === true);
    const withoutPic = current.filter((r) => r.hasPicture === false);
    if (withPic.length >= 2 && withoutPic.length >= 2) {
      const avg = (l: typeof current) => sum(l, (r) => r.engagement) / l.length;
      const a = avg(withPic);
      const b = avg(withoutPic);
      out.push({
        q: "Bài có ảnh và không ảnh, loại nào hiệu quả hơn?",
        a: `Trong kỳ này, bài ${a >= b ? "có ảnh" : "không ảnh"} hiệu quả hơn: TB ${fmt(Math.round(Math.max(a, b)))} so với ${fmt(Math.round(Math.min(a, b)))} tương tác/bài (có ảnh: ${withPic.length} bài · không ảnh: ${withoutPic.length} bài). Đây là tương quan trong dữ liệu hiện có, chưa đủ để kết luận nhân quả.`,
      });
    } else {
      out.push({
        q: "Bài có ảnh và không ảnh, loại nào hiệu quả hơn?",
        a: `Chưa đủ dữ liệu để so sánh: cần tối thiểu 2 bài mỗi loại trong kỳ (hiện có ${withPic.length} bài có ảnh, ${withoutPic.length} bài không ảnh có số liệu rõ định dạng).`,
      });
    }

    // 3. Change vs previous period
    if (hasPrevious && previous.length > 0) {
      const cur = sum(current, (r) => r.engagement);
      const prev = sum(previous, (r) => r.engagement);
      const diff = cur - prev;
      const pct = prev > 0 ? Math.abs((diff / prev) * 100).toFixed(0) : null;
      out.push({
        q: "So với kỳ trước, hiệu quả thay đổi thế nào?",
        a: `Tổng tương tác kỳ này ${fmt(cur)} so với ${fmt(prev)} kỳ trước — ${diff >= 0 ? "tăng" : "giảm"} ${fmt(Math.abs(diff))}${pct ? ` (${diff >= 0 ? "+" : "−"}${pct}%)` : ""}. Số bài: ${current.length} so với ${previous.length} bài kỳ trước.`,
      });
    } else {
      out.push({
        q: "So với kỳ trước, hiệu quả thay đổi thế nào?",
        a: "Chưa có bài nào trong kỳ trước tương đương nên không so sánh được. Khi Page có thêm lịch sử đăng bài, câu trả lời này sẽ tự có số.",
      });
    }

    // 4. Best posting hour (guarded)
    if (current.length >= 3) {
      const byHour = new Map<number, { total: number; count: number }>();
      for (const r of current) {
        if (!r.date) continue;
        const h = (new Date(r.date).getUTCHours() + 7) % 24;
        const e = byHour.get(h) ?? { total: 0, count: 0 };
        e.total += r.engagement;
        e.count += 1;
        byHour.set(h, e);
      }
      const best = [...byHour.entries()].map(([h, v]) => ({ h, avg: v.total / v.count, count: v.count })).sort((a, b) => b.avg - a.avg)[0];
      if (best && best.count >= 2) {
        out.push({
          q: "Khung giờ nào đang hiệu quả nhất?",
          a: `Khung ${best.h}:00 có tương tác trung bình cao nhất: ${fmt(Math.round(best.avg))}/bài, dựa trên ${best.count} bài trong kỳ. Mẫu còn nhỏ — nên thử nghiệm thêm vài tuần trước khi cố định lịch đăng.`,
        });
      } else {
        out.push({
          q: "Khung giờ nào đang hiệu quả nhất?",
          a: "Dữ liệu giờ đăng còn rải rác (mỗi khung giờ chưa tới 2 bài) — chưa kết luận được khung giờ tốt nhất.",
        });
      }
    } else {
      out.push({
        q: "Khung giờ nào đang hiệu quả nhất?",
        a: `Cần tối thiểu 3 bài trong kỳ để phân tích giờ đăng (hiện có ${current.length} bài).`,
      });
    }

    return out;
  }, [current, previous, hasPrevious]);

  return (
    <section className="mt-5 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-4">
      <h4 className="mb-1 flex items-center gap-2 text-sm font-black">
        <MessageCircleQuestion size={15} className="text-[var(--accent)]" /> Hỏi đáp số liệu
      </h4>
      <p className="mb-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--muted)]">
        <BarChart3 size={12} className="mt-0.5 shrink-0" />
        Trả lời tự động từ chính số liệu đang hiển thị trên trang này — kèm căn cứ số, không suy đoán ngoài dữ liệu.
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {answers.map((item, i) => (
          <button
            key={item.q}
            type="button"
            onClick={() => setSelected(i)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-extrabold transition ${selected === i ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"}`}
          >
            {item.q}
          </button>
        ))}
      </div>
      <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-[var(--ink)]">
          <Lightbulb size={14} className="mt-0.5 shrink-0 text-[var(--orange)]" />
          {answers[selected]?.a}
        </p>
      </div>
    </section>
  );
}
