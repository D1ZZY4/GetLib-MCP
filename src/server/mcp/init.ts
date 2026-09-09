import { ensureBootstrapAccount } from "@/application/auth/auth.service";
import { getDatabaseStatus } from "./infrastructure/database";
import { log } from "./utils/logger";
import { detectEnvironment, resolveDatabaseMode } from "./runtime";
import { ensureRegistryLoaded } from "./registry/registry-loader";
import { validateProductionPolicy } from "./runtime";

let initialized = false;

/**
 * Application initialization lifecycle (startup order per architecture
 * rules: detect environment, validate configuration, determine database
 * mode, load registry, run database health precondition, bootstrap
 * account, ready). Idempotent and safe to call from stdio entry, web
 * instrumentation, tests, or first-request adapters.
 *
 * Startup contract: a failed production policy (mock database selected
 * for production, or Supabase unconfigured in production) is fatal -
 * fail fast instead of serving traffic on an invalid database policy.
 * A failed production database *connection* or bootstrap write is a loud
 * error log plus degraded mode, never a startup crash: no tool path
 * requires the database (bootstrap falls back to env credentials plus
 * memory, logs fall back to the in-memory ring, settings are
 * file-based), so transient outages degrade instead of taking the whole
 * server down. Hosted web deployments that must refuse to serve without
 * a live database should additionally gate on the health endpoint.
 */
export async function initializeApplication(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const environment = detectEnvironment();
  try {
    validateProductionPolicy();
  } catch (error) {
    log({ level: "error", msg: "init.production-policy-failed", error: String(error) });
    if (environment === "production") {
      throw error;
    }
  }
  const databaseMode = resolveDatabaseMode(environment);
  ensureRegistryLoaded();
  // Health precondition runs before bootstrap on purpose: bootstrap
  // persists through the database, so it needs the database verdict
  // first. (Blueprint section 64 lists bootstrap earlier; the enforced
  // invariant is the same either way - no traffic before both complete.)
  try {
    const status = await getDatabaseStatus();
    log({
      level: status.health === "healthy" || status.health === "mock" ? "debug" : "warn",
      msg: "init.database-precondition",
      mode: status.mode,
      health: status.health,
    });
  } catch (error) {
    log({ level: "warn", msg: "init.database-precondition-failed", error: String(error) });
  }
  try {
    await ensureBootstrapAccount();
  } catch (error) {
    log({ level: "warn", msg: "init.bootstrap-failed", error: String(error) });
  }
  log({ level: "info", msg: "init.ready", environment, databaseMode });
}

export function resetInitialization(): void {
  initialized = false;
}
