/**
 * Next.js server startup hook. Runs the application initialization
 * lifecycle (environment validation, registry, production policy,
 * bootstrap) once per server process so web routes never serve traffic
 * with an unvalidated policy. Skipped during builds and on edge runtimes.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { initializeApplication } = await import("./server/mcp/init");
  await initializeApplication();
}
