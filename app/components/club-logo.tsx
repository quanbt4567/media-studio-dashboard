"use client";

interface ClubLogoProps {
  size?: "md" | "lg";
}

/**
 * Club branding shown in the app header and on the login page: a graphite
 * monogram badge (matching the template theme) + the club name/tagline.
 * Rendered purely in code — no external logo file to lose or break.
 *
 * Override the name/tagline with NEXT_PUBLIC_CLUB_NAME and
 * NEXT_PUBLIC_CLUB_TAGLINE (rebuild after changing).
 */
export default function ClubLogo({ size = "md" }: ClubLogoProps) {
  const name = process.env.NEXT_PUBLIC_CLUB_NAME || "BCN";
  const tagline = process.env.NEXT_PUBLIC_CLUB_TAGLINE || "media desk";
  const box = size === "lg" ? "h-11 w-11 text-[11px]" : "h-9 w-9 text-[9px]";
  const titleSize = size === "lg" ? "text-base" : "text-sm";

  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden="true"
        className={`flex ${box} select-none items-center justify-center rounded-xl bg-gradient-to-br from-[#2e2e33] to-[#101013] font-black tracking-[.08em] text-white shadow-[0_6px_16px_rgba(16,16,19,.35)] ring-1 ring-black/20`}
      >
        BCN
      </div>
      <div className="leading-none">
        <p className={`${titleSize} font-black tracking-[-.02em]`}>{name}</p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[.3em] text-[var(--muted)]">
          {tagline}
        </p>
      </div>
    </div>
  );
}
