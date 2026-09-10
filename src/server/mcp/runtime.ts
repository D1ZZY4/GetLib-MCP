/**
 * Centralized runtime environment detection and database-mode policy.
 *
 * This is the single place that decides development vs production and
 * which database policy applies. No feature code may read NODE_ENV,
 * VERCEL_ENV, or database-mode variables directly - import from here.
 *
 * Environment model (debug override wins, auto-detect otherwise):
 * 1. GET_LIB_MODE=development or production forces that environment.
 *    Only set it to debug or force an environment - normal startups leave
 *    it empty and auto-detect from deployment metadata.
 * 2. GET_LIB_MODE unset or empty auto-detects from deployment metadata:
 *    VERCEL_ENV or NODE_ENV signaling production yields production;
 *    an explicit development/test signal yields development.
 * 3. No signal at all falls back to production (secure default).
 * 4. Any other GET_LIB_MODE value fails fast with a clear error.
 *
 * Database policy:
 * - Production always uses the real Supabase production database. There is
 *   no mock fallback in production.
 * - Development supports mock (default) and real development Supabase
 *   (opt-in via GETLIB_DATABASE_MODE=supabase with Supabase vars present).
 */

export type RuntimeEnvironment = "development" | "production";

export type DatabaseMode = "mock" | "supabase-development" | "supabase-production";

function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed;
}

export interface EnvironmentSignals {
  libMode: string | undefined;
  vercelEnv: string | undefined;
  nodeEnv: string | undefined;
}

/**
 * Pure environment decision for the precedence above. Kept side-effect
 * free so the full matrix is unit-testable without touching process.env.
 */
export function resolveEnvironment(signals: EnvironmentSignals): RuntimeEnvironment {
  if (signals.libMode !== undefined) {
    const normalized = signals.libMode.trim().toLowerCase();
    if (normalized === "production" || normalized === "development") return normalized;
    throw new Error(
      `Invalid GET_LIB_MODE: "${signals.libMode}" -- must be "production" or "development"`,
    );
  }
  const vercelEnv = signals.vercelEnv?.trim().toLowerCase();
  const nodeEnv = signals.nodeEnv?.trim().toLowerCase();
  if (vercelEnv === "production" || nodeEnv === "production") return "production";
  // Ephemeral environments must never inherit production policy: a Vercel
  // preview pointing at production keys would otherwise serve (or fail
  // fast against) real production data. Explicit GET_LIB_MODE=production
  // remains the only way to opt a preview into production.
  if (
    vercelEnv === "development" ||
    vercelEnv === "preview" ||
    vercelEnv === "staging" ||
    nodeEnv === "development" ||
    nodeEnv === "test"
  ) {
    return "development";
  }
  return "production";
}

export function detectEnvironment(): RuntimeEnvironment {
  return resolveEnvironment({
    libMode: readEnv("GET_LIB_MODE"),
    vercelEnv: readEnv("VERCEL_ENV"),
    nodeEnv: readEnv("NODE_ENV"),
  });
}

function hasSupabaseConfig(): boolean {
  // Direct reads here are intentional: runtime detection must stay free of
  // config-module import cycles in edge/test runtimes. The canonical parsed
  // values live in config.ts; this is only a presence check for policy.
  // Both modules share the key lists below so a new variable name cannot
  // silently diverge policy from parsing.
  const url = firstPresent(SUPABASE_URL_KEYS);
  const anon = firstPresent(SUPABASE_ANON_KEYS);
  return url !== undefined && anon !== undefined;
}

function hasSupabasePrivilegedConfig(): boolean {
  // Same presence-check pattern as hasSupabaseConfig: the privileged
  // repository path requires a service key, anon alone degrades every
  // write to a no-op. Shared key lists keep policy and parsing in sync.
  return firstPresent(SUPABASE_SERVICE_KEYS) !== undefined;
}

/**
 * Auth-enabled presence for startup policy only. Mirrors
 * boolEnv("GETLIB_AUTHENTICATICATION_ENABLE", false) exactly ("true"/"1"
 * enable, anything else is disabled here); an invalid value still throws
 * at config load before this policy ever runs.
 */
function authEnabledForPolicy(): boolean {
  const raw = readEnv("GETLIB_AUTHENTICATICATION_ENABLE");
  if (raw === undefined) return false;
  return raw === "true" || raw === "1";
}

function sessionSecretConfigured(): boolean {
  return firstPresent(["GETLIB_SESSION_SECRET"]) !== undefined;
}

function firstPresent(names: string[]): string | undefined {
  for (const name of names) {
    const value = readEnv(name);
    if (value !== undefined) return value;
  }
  return undefined;
}

/**
 * Which Supabase URL variable won, plus any shadowed siblings. Multiple
 * set URL vars pointing at different projects would silently target the
 * first - callers log the shadowed names (never values) at startup.
 */
export function supabaseUrlSelection(): { used: string | undefined; shadowed: string[] } {
  const set = SUPABASE_URL_KEYS.filter((name) => readEnv(name) !== undefined);
  return { used: set[0], shadowed: set.slice(1) };
}

/**
 * Canonical Supabase variable names, shared by runtime policy
 * (presence checks here) and config parsing (config.ts firstEnv).
 * Add new accepted names in exactly one place: these lists.
 */
export const SUPABASE_URL_KEYS: string[] = ["GETLIB_SUPABASE_URL", "SUPABASE_URL"];

export const SUPABASE_ANON_KEYS: string[] = [
  "GETLIB_SUPABASE_ANON_KEY",
  "GETLIB_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

export const SUPABASE_SERVICE_KEYS: string[] = [
  "GETLIB_SUPABASE_SERVICE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

/**
 * Realtime database-mode selection for the Developments page. Development
 * only: applies immediately to this server process and resets to the env
 * default on restart. Production always ignores it.
 */
export type DatabaseModeSelection = "mock" | "supabase";

let runtimeOverride: DatabaseModeSelection | null = null;

export function setDatabaseModeOverride(mode: DatabaseModeSelection | null): void {
  runtimeOverride = mode;
}

function envDefaultMode(): DatabaseMode {
  const requested = (readEnv("GETLIB_DATABASE_MODE") ?? "mock").trim().toLowerCase();
  if (requested === "mock") return "mock";
  if (requested === "supabase" || requested === "supabase-development" || requested === "real") {
    return "supabase-development";
  }
  throw new Error(
    `Invalid GETLIB_DATABASE_MODE: "${requested}" - must be "mock" or "supabase" ("supabase-development" and "real" are accepted aliases).`,
  );
}

export interface DatabaseModePolicy {
  effective: DatabaseMode;
  envDefault: DatabaseMode;
  override: DatabaseModeSelection | null;
}

/**
 * Full database-mode policy: effective mode plus where it came from, so UI
 * can show active vs env-default vs override. Production is fixed to
 * supabase-production and never honors the realtime override.
 */
export function getDatabaseModePolicy(env: RuntimeEnvironment = detectEnvironment()): DatabaseModePolicy {
  if (env === "production") {
    return { effective: "supabase-production", envDefault: "supabase-production", override: runtimeOverride };
  }
  const envDefault = envDefaultMode();
  if (runtimeOverride === "mock") return { effective: "mock", envDefault, override: runtimeOverride };
  if (runtimeOverride === "supabase") {
    return { effective: "supabase-development", envDefault, override: runtimeOverride };
  }
  return { effective: envDefault, envDefault, override: null };
}

/**
 * Resolve the active database mode from environment policy. Production is
 * fixed to supabase-production. Development defaults to mock unless the
 * operator explicitly opts into a real development database via env or the
 * realtime Developments-page override.
 */
export function resolveDatabaseMode(env: RuntimeEnvironment = detectEnvironment()): DatabaseMode {
  return getDatabaseModePolicy(env).effective;
}

/**
 * Validate production policy at startup. Production must never silently
 * fall back to mock data - fail fast when the real database is missing.
 */
export function validateProductionPolicy(snapshot: RuntimeSnapshot = getRuntimeSnapshot()): void {
  if (snapshot.environment !== "production") return;
  if (snapshot.databaseMode !== "supabase-production") {
    throw new Error("Production must use the real Supabase database - mock mode is not allowed.");
  }
  if (!snapshot.supabaseConfigured) {
    throw new Error(
      "Missing Supabase configuration in production. Set GETLIB_SUPABASE_URL and GETLIB_SUPABASE_ANON_KEY.",
    );
  }
  // The privileged repository path requires the service key; anon alone
  // degrades every write to a no-op. Fail fast instead of serving
  // silently degraded production traffic.
  if (!snapshot.supabasePrivilegedConfigured) {
    throw new Error("Missing Supabase service key in production. Set GETLIB_SUPABASE_SERVICE_KEY.");
  }
  // Session tokens are stateless HMAC; without a shared secret every
  // serverless instance rejects the others' sessions. Fail fast instead
  // of booting green and 500ing the first sign-in.
  if (snapshot.authEnabled && !snapshot.sessionSecretConfigured) {
    throw new Error("Missing GETLIB_SESSION_SECRET in production with authentication enabled.");
  }
}

export interface RuntimeSnapshot {
  environment: RuntimeEnvironment;
  databaseMode: DatabaseMode;
  isMock: boolean;
  supabaseConfigured: boolean;
  supabasePrivilegedConfigured: boolean;
  authEnabled: boolean;
  sessionSecretConfigured: boolean;
  vercelEnv: string | undefined;
  nodeEnv: string | undefined;
}

/**
 * Point-in-time runtime snapshot for health, settings, and diagnostics.
 * Cheap and side-effect free - safe to call from any adapter.
 */
export function getRuntimeSnapshot(): RuntimeSnapshot {
  const environment = detectEnvironment();
  const databaseMode = resolveDatabaseMode(environment);
  return {
    environment,
    databaseMode,
    isMock: databaseMode === "mock",
    supabaseConfigured: hasSupabaseConfig(),
    supabasePrivilegedConfigured: hasSupabasePrivilegedConfig(),
    authEnabled: authEnabledForPolicy(),
    sessionSecretConfigured: sessionSecretConfigured(),
    vercelEnv: readEnv("VERCEL_ENV"),
    nodeEnv: readEnv("NODE_ENV"),
  };
}
