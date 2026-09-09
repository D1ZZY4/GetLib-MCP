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
  if (raw === undefined || raw.length === 0) return undefined;
  return raw;
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
  if (vercelEnv === "development" || nodeEnv === "development" || nodeEnv === "test") {
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
  const url = readEnv("GETLIB_SUPABASE_URL") ?? readEnv("SUPABASE_URL");
  const anon =
    readEnv("GETLIB_SUPABASE_ANON_KEY") ??
    readEnv("GETLIB_SUPABASE_PUBLISHABLE_KEY") ??
    readEnv("SUPABASE_ANON_KEY") ??
    readEnv("SUPABASE_PUBLISHABLE_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return url !== undefined && anon !== undefined;
}

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
  if (requested === "supabase" || requested === "supabase-development" || requested === "real") {
    return "supabase-development";
  }
  return "mock";
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
}

export interface RuntimeSnapshot {
  environment: RuntimeEnvironment;
  databaseMode: DatabaseMode;
  isMock: boolean;
  supabaseConfigured: boolean;
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
    vercelEnv: readEnv("VERCEL_ENV"),
    nodeEnv: readEnv("NODE_ENV"),
  };
}
