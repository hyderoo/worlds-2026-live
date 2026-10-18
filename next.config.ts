import type { NextConfig } from "next";

// Real external requests (inventoried from the code and live HTML): team logos from static.lolesports.com (and its akamai CDN alias),
// champion art/icons from Riot Data Dragon, optional Supabase Realtime (https + wss). Fonts are self-hosted by next/font.
// Next.js emits small inline bootstrap scripts, so script-src needs 'unsafe-inline' (no nonce setup); everything else is locked down.
// Push: the browser talks to the push service itself, which CSP does not govern. The service worker is same-origin.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://static.lolesports.com https://am-a.akamaihd.net https://ddragon.leagueoflegends.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const config: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "static.lolesports.com" }] },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        ],
      },
    ];
  },
};
export default config;
