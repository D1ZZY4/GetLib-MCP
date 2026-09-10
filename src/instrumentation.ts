/**
 * Next.js server startup hook. Runs the application initialization
 * lifecycle (environment validation, registry, production policy,
 * bootstrap) once per server process so web routes never serve traffic
 * with an unvalidated policy. Skipped during builds and on edge runtimes.
 *
 * Explicit centralized-config exception: NEXT_RUNTIME and NEXT_PHASE are
 * Next.js lifecycle signals available only here before dependency
 * injection exists. They are infrastructure signals, not business
 * configuration, so they are read directly instead of via config.ts.
 * All business configuration still goes through server/mcp/config.ts.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  // Server runtime: info/debug to stdout so platform log levels stay
  // truthful (Vercel maps stderr to error). stdio keeps stderr-only.
  const { setLogStreamMode } = await import("./server/mcp/utils/logger");
  setLogStreamMode("split");
  const { initializeApplication } = await import("./server/mcp/init");
  await initializeApplication();
}
