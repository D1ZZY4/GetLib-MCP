import { log } from "./utils/logger";
import { resetDatabaseCache } from "./infrastructure/database";
import { closeAllHttpSessions } from "./transport/http";
import { closeAllSseSessions } from "./transport/sse";

let shuttingDown = false;

/**
 * Application shutdown lifecycle: stop accepting work is owned by the
 * host (process signal / serverless freeze), here we drain what we own -
 * active MCP sessions, cached repository handles - then let the process
 * exit. Safe to call multiple times; only the first call runs cleanup.
 */
export async function shutdownApplication(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log({ level: "info", msg: "shutdown.start" });
  try {
    await Promise.allSettled([closeAllHttpSessions(), closeAllSseSessions()]);
  } catch (error) {
    log({ level: "warn", msg: "shutdown.sessions-failed", error: String(error) });
  }
  try {
    resetDatabaseCache();
  } catch (error) {
    log({ level: "warn", msg: "shutdown.database-failed", error: String(error) });
  }
  log({ level: "info", msg: "shutdown.complete" });
}

/** Test hook - re-arms shutdown for repeatable lifecycle tests. */
export function resetShutdown(): void {
  shuttingDown = false;
}
