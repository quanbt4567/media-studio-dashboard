"use client";

import { useState } from "react";

interface ClubLogoProps {
  size?: "md" | "lg";
}

/**
 * Club branding shown in the sidebar and on the login page.
 *
 * To use your own logo: drop a square image at `public/club-logo.png`
 * (PNG or JPG) and restart the dev server / rebuild. If the file is
 * missing, it falls back to an initial-letter badge automatically.
 *
 * Override the name/tagline with NEXT_PUBLIC_CLUB_NAME and
 * NEXT_PUBLIC_CLUB_TAGLINE (rebuild after changing).
 */
export default function ClubLogo({ size = "md" }: ClubLogoProps) {
  const [imgOk, setImgOk] = useState(true);
  const name = process.env.NEXT_PUBLIC_CLUB_NAME || "BCN";
  const tagline = process.env.NEXT_PUBLIC_CLUB_TAGLINE || "media desk";
  const box = size === "lg" ? "h-11 w-11 text-base" : "h-9 w-9 text-sm";
  const titleSize = size === "lg" ? "text-base" : "text-sm";

  return (
    <div className="flex items-center gap-3">
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/club-logo.png"
          alt={`${name} logo`}
          className={`${box} rounded-xl object-cover`}
          onError={() => setImgOk(false)}
        />
      ) : (
        <div className={`flex ${box} items-center justify-center rounded-xl bg-[var(--ink)] font-bold text-[var(--lime)]`}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div>
        <p className={`${titleSize} font-extrabold tracking-tight`}>{name}</p>
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">{tagline}</p>
      </div>
    </div>
  );
}
