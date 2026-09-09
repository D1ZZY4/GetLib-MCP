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
 * instrumentation, tests, or first-request adapters. Production with
 * missing database configuration fails fast here; bootstrap failure
 * fails fast in production and warns in development.
 */
export async function initializeApplication(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const environment = detectEnvironment();
  try {
    validateProductionPolicy();
  } catch (error) {
    log({ level: "error", msg: "init.production-policy-failed", error: String(error) });
    throw error;
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
    if (environment === "production") {
      log({ level: "error", msg: "init.bootstrap-failed", error: String(error) });
      throw error;
    }
    log({ level: "warn", msg: "init.bootstrap-failed", error: String(error) });
  }
  log({ level: "info", msg: "init.ready", environment, databaseMode });
}

export function resetInitialization(): void {
  initialized = false;
}
