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
 * Degraded-startup contract: no tool path requires the database
 * (bootstrap falls back to env credentials plus memory, logs fall back
 * to the in-memory ring, settings are file-based), so a failed
 * production database precondition is a loud error log plus degraded
 * mode - never a startup crash. Hosted web deployments that must refuse
 * to serve without a database should gate on validateProductionPolicy
 * explicitly instead of using this entrypoint.
 */
export async function initializeApplication(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const environment = detectEnvironment();
  try {
    validateProductionPolicy();
  } catch (error) {
    log({ level: "error", msg: "init.production-policy-failed", error: String(error) });
  }
  const databaseMode = resolveDatabaseMode(environment);
  ensureRegistryLoaded();
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
