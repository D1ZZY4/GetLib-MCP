import type { NextConfig } from "next";

// Replit serves the dev server through proxied *.replit.dev / *.repl.co
// domains, which Next.js blocks by default. Wildcards keep this working
// across sessions: ** matches one or more leading hostname labels.
const allowedDevOrigins = [
  "**.replit.dev",
  "**.repl.co",
  process.env.REPLIT_DEV_DOMAIN,
  ...(process.env.REPLIT_DOMAINS?.split(",") ?? []),
].filter((origin): origin is string => typeof origin === "string" && origin.length > 0);

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
