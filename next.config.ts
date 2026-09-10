import type { NextConfig } from "next";

// Development-only origins for cloud workspaces. Next.js consumes
// allowedDevOrigins in development mode only; production is unaffected.
const allowedDevOrigins = [
  "**.replit.dev",
  "**.repl.co",
  process.env.REPLIT_DEV_DOMAIN,
  ...(process.env.REPLIT_DOMAINS?.split(",") ?? []),
].filter((origin): origin is string => typeof origin === "string" && origin.length > 0);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  poweredByHeader: false,
  // Security headers mirror vercel.json so Docker and other non-Vercel
  // hosts enforce the same baseline. Vercel merges both sources.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
