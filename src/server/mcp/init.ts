import { ensureBootstrapAccount } from "@/application/auth/auth.service";
import { liveAuthDeps } from "./infrastructure/deps/auth-deps";
import { getDatabaseStatus } from "./infrastructure/database";
import { config } from "./config";
import { log } from "./utils/logger";
import { detectEnvironment, resolveDatabaseMode, supabaseUrlSelection } from "./runtime";
import { ensureRegistryLoaded } from "./registry/registry-loader";
import { validateProductionPolicy } from "./runtime";
import { diskDocCache } from "./services/cache";
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
  // NOTE: `initialized` flips only on success at the end. A failed run
  // (production policy or bootstrap throw) must stay retryable instead
  // of poisoning later calls into a silent early return.
  const environment = detectEnvironment();
  try {
    validateProductionPolicy();
  } catch (error) {
    log({ level: "error", msg: "init.production-policy-failed", error: String(error) });
    if (environment === "production") {
      throw error;
    }
  }
  if (environment === "production" && !config.authEnabled) {
    // Authentication disabled in production is a valid mode, but it must
    // never happen by accident (e.g. a missing env var). Loud by design.
    log({
      level: "error",
      msg: "init.auth-disabled-production",
      detail: "GETLIB_AUTHENTICATION_ENABLE is not enabled: the dashboard and MCP serve without sign-in.",
    });
  }
  const urlSelection = supabaseUrlSelection();
  if (urlSelection.shadowed.length > 0) {
    // Names only, never values: two URL vars set means one project wins
    // silently, which is how dev data ends up targeted as production.
    log({
      level: "warn",
      msg: "init.supabase-url-shadowed",
      used: urlSelection.used,
      shadowed: urlSelection.shadowed,
    });
  }
  const databaseMode = resolveDatabaseMode(environment);
  ensureRegistryLoaded();
  // Bounded disk cache: prune expired entries once per process start so
  // persistent hosts (Docker volume, bare metal) do not accumulate stale
  // files forever. Fire-and-forget - a prune failure must never block boot.
  void diskDocCache.prune().then((removed) => {
    if (removed > 0) log({ level: "debug", msg: "init.disk-cache-pruned", removed });
  }).catch(() => void 0);
  // Health precondition runs before bootstrap on purpose: bootstrap
  // persists through the database, so it needs the database verdict
  // first. The enforced invariant is the same either way - no traffic
  // before both complete.
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
    const bootstrap = await ensureBootstrapAccount(liveAuthDeps);
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
    if (environment === "production" && bootstrap.isFallback) {
      // Production must never run on fallback bootstrap credentials
      // outside an explicitly documented emergency mode. Fail fast with
      // a safe audited error instead of serving with default credentials.
      const fallbackError = new Error(
        "Default bootstrap credentials are active in production. Set GETLIB_DEFAULT_ACCOUNT and GETLIB_DEFAULT_PASS.",
      );
      log({ level: "error", msg: "init.bootstrap-fallback-production", error: String(fallbackError) });
      throw fallbackError;
    }
  } catch (error) {
    log({ level: "error", msg: "init.bootstrap-failed", error: String(error) });
    // Production bootstrap writes are authoritative: a silent failure
    // would leave instances disagreeing about the account identity.
    if (environment === "production") throw error;
  }
  log({ level: "info", msg: "init.ready", environment, databaseMode });
  initialized = true;
}

export function resetInitialization(): void {
  initialized = false;
  initializing = null;
}
