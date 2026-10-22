import type { NextConfig } from "next";

/**
 * Baseline security headers for every response. Deliberately scoped:
 * frame-ancestors/X-Frame-Options stop clickjacking, nosniff and
 * Referrer-Policy are free wins. A full script/style CSP is NOT set —
 * the studio relies on inline styles and data-URI media throughout, and
 * a wrong policy would break it; tighten later with report-only first.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
