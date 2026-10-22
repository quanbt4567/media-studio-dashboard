"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Crop modal: drag the photo inside the template frame to choose which part
 * shows. Non-destructive — only the focal point (0..1) is saved.
 */
export default function ImageCropper({
  src,
  frameW,
  frameH,
  focalX,
  focalY,
  onChange,
  onClose,
}: {
  src: string;
  frameW: number;
  frameH: number;
  focalX: number;
  focalY: number;
  onChange: (fx: number, fy: number) => void;
  onClose: () => void;
}) {
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const focalRef = useRef({ fx: focalX, fy: focalY });
  focalRef.current = { fx: focalX, fy: focalY };

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  // Deterministic display box derived from the frame's aspect ratio —
  // no DOM measuring, so it can never collapse or mis-scale.
  const aspect = frameW > 0 && frameH > 0 ? frameW / frameH : 1;
  const boxH = 300;
  const boxW = Math.min(520, Math.max(120, boxH * aspect));

  const scale = nat ? Math.max(boxW / nat.w, boxH / nat.h) : 1;
  const dw = nat ? nat.w * scale : 0;
  const dh = nat ? nat.h * scale : 0;
  const left = (boxW - dw) * focalX;
  const top = (boxH - dh) * focalY;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, fx: focalRef.current.fx, fy: focalRef.current.fy };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || !nat) return;
    const rangeX = dw - boxW;
    const rangeY = dh - boxH;
    const fx = rangeX > 0 ? drag.fx - (e.clientX - drag.x) / rangeX : 0.5;
    const fy = rangeY > 0 ? drag.fy - (e.clientY - drag.y) / rangeY : 0.5;
    onChange(Math.min(1, Math.max(0, fx)), Math.min(1, Math.max(0, fy)));
  }

  function endDrag() {
    dragRef.current = null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold">Căn ảnh trong khung</h3>
            <p className="text-[11px] text-[var(--muted)]">Kéo ảnh để chọn vùng hiển thị — khung template giữ nguyên.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-[var(--line)] p-1.5 hover:bg-[var(--line)]">
            <X size={15} />
          </button>
        </div>

        <div className="flex justify-center">
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="relative touch-none select-none overflow-hidden rounded-xl bg-[#111] shadow-inner"
            style={{ width: boxW, height: boxH, cursor: nat ? "grab" : "default" }}
          >
            {!nat && (
              <p className="absolute inset-0 flex items-center justify-center text-xs text-white/60">Đang tải ảnh…</p>
            )}
            {nat && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{ width: dw, height: dh, left, top }}
              />
            )}
            {/* frame guides */}
            <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-white/70" />
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/25" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onChange(0.5, 0.5)}
            className="rounded-xl border border-[var(--line)] px-4 py-2 text-xs font-extrabold hover:border-[var(--accent)]"
          >
            Về giữa
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[var(--accent)] px-6 py-2 text-xs font-extrabold text-white"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
