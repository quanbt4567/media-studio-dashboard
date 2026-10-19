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
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const focalRef = useRef({ fx: focalX, fy: focalY });
  focalRef.current = { fx: focalX, fy: focalY };

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  // Displayed box: fit the frame's aspect ratio inside the modal.
  const aspect = frameW / frameH;
  // Cover metrics at display size.
  function metrics(cw: number, ch: number) {
    if (!nat) return null;
    const scale = Math.max(cw / nat.w, ch / nat.h);
    const dw = nat.w * scale;
    const dh = nat.h * scale;
    return { dw, dh };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, fx: focalRef.current.fx, fy: focalRef.current.fy };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    const box = boxRef.current;
    if (!drag || !box || !nat) return;
    const rect = box.getBoundingClientRect();
    const m = metrics(rect.width, rect.height);
    if (!m) return;
    const rangeX = m.dw - rect.width;
    const rangeY = m.dh - rect.height;
    const fx = rangeX > 0 ? drag.fx - (e.clientX - drag.x) / rangeX : 0.5;
    const fy = rangeY > 0 ? drag.fy - (e.clientY - drag.y) / rangeY : 0.5;
    onChange(Math.min(1, Math.max(0, fx)), Math.min(1, Math.max(0, fy)));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  const m = boxRef.current && nat ? metrics(boxRef.current.clientWidth, boxRef.current.clientHeight) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl"
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

        <div
          ref={boxRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative mx-auto w-full max-w-[520px] touch-none select-none overflow-hidden rounded-xl bg-[#111] shadow-inner"
          style={{ aspectRatio: `${aspect}`, cursor: "grab" }}
        >
          {nat && m && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: m.dw,
                height: m.dh,
                left: (boxRef.current!.clientWidth - m.dw) * focalX,
                top: (boxRef.current!.clientHeight - m.dh) * focalY,
              }}
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

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onChange(0.5, 0.5)}
            className="rounded-xl border border-[var(--line)] px-4 py-2 text-xs font-extrabold hover:border-[var(--ink)]"
          >
            Về giữa
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[var(--ink)] px-6 py-2 text-xs font-extrabold text-white"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
