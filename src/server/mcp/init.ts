import { ensureBootstrapAccount } from "@/application/auth/auth.service";
import { getDatabaseStatus } from "./infrastructure/database";
import { log } from "./utils/logger";
import { detectEnvironment, resolveDatabaseMode } from "./runtime";
import { ensureRegistryLoaded } from "./registry/registry-loader";
import { validateProductionPolicy } from "./runtime";
// Transport modules self-register their client-snapshot listers with the
// application clients service on import. Importing them here guarantees the
// control plane sees live sessions even when the first request in this
// process hits a management route instead of a transport route.
import "./transport/http";
import "./transport/sse";

let initialized = false;
let initializing: Promise<void> | null = null;

/**
 * Application initialization lifecycle (startup order per architecture
 * rules: detect environment, validate configuration, determine database
 * mode, load registry, run database health precondition, bootstrap
 * account, ready). Idempotent and safe to call from stdio entry, web
 * instrumentation, tests, or first-request adapters.
 *
  * Startup contract: an invalid production policy (mock database
  * selected for production, Supabase unconfigured or missing the service
  * key in production, session secret missing while auth is enabled) is
  * fatal - fail fast instead of serving traffic on an invalid policy.
  * A failed production database *connection* on the read-only precondition
  * ping degrades with a loud error log: no tool path requires the
  * database (bootstrap falls back to env credentials plus memory, logs
  * fall back to the in-memory ring, settings are file-based), so a
  * transient outage at boot degrades instead of taking the whole server
  * down. A failed production bootstrap *write* is fatal and rethrows:
  * the persisted bootstrap row is authoritative for the account identity,
  * so a silent write failure would leave instances disagreeing about
  * credentials. Hosted web deployments that must refuse to serve without
  * a live database should additionally gate on the health endpoint.
 */
export async function initializeApplication(): Promise<void> {
  if (initialized) return;
  if (initializing) {
    await initializing;
    return;
  }
  initializing = runInitialization();
  try {
    await initializing;
  } finally {
    initializing = null;
  }
}

async function runInitialization(): Promise<void> {
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
    const bootstrap = await ensureBootstrapAccount();
    // Redacted by design: flags and lengths only, never the account or
    // password. Lets operators confirm production env vars actually
    // reached the runtime (missing var, wrong scope, stale deploy) from
    // Runtime Logs instead of guessing from signin 401s.
    log({
      level: "info",
      msg: "auth.bootstrap.ready",
      fallbackActive: bootstrap.isFallback,
      credentialsChanged: bootstrap.credentialsChanged,
      accountLength: bootstrap.account.length,
    });
  } catch (error) {
    log({ level: "error", msg: "init.bootstrap-failed", error: String(error) });
    // Production bootstrap writes are authoritative: a silent failure
    // would leave instances disagreeing about the account identity.
    if (environment === "production") throw error;
  }
  log({ level: "info", msg: "init.ready", environment, databaseMode });
}

export function resetInitialization(): void {
  initialized = false;
  initializing = null;
}
