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
};

export default nextConfig;
