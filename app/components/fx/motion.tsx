"use client";

import gsap from "gsap";
import { useEffect, useRef, type ReactNode } from "react";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Callback ref for popovers: pops in from its anchor corner (fade + slight
 * scale/slide) when the element mounts. Attach with ref={popInRef}.
 */
export function popInRef<T extends HTMLElement>(el: T | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { opacity: 0, scale: 0.97, y: -6 },
    { opacity: 1, scale: 1, y: 0, duration: 0.32, ease: "power3.out", overwrite: true, transformOrigin: "top right" },
  );
}

/** Callback ref for in-flow panels: a gentle fade + rise on mount. */
export function fadeSlideRef<T extends HTMLElement>(el: T | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.38, ease: "power3.out", overwrite: true },
  );
}

/** Wrapper that replays a fade + slide transition whenever `k` changes (tab panels). */
export function FadeSlide({ k, children }: { k: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      ref.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" },
    );
    return () => {
      tween.kill();
    };
  }, [k]);
  return <div ref={ref}>{children}</div>;
}

/** Animated number: counts from the previous value to the new one. */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = value.toLocaleString("vi-VN");
      prev.current = value;
      return;
    }
    const obj = { v: prev.current };
    const tween = gsap.to(obj, {
      v: value,
      duration: 0.9,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = Math.round(obj.v).toLocaleString("vi-VN");
      },
    });
    prev.current = value;
    return () => {
      tween.kill();
    };
  }, [value]);
  return <span ref={ref}>{value.toLocaleString("vi-VN")}</span>;
}
