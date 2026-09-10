// Shared with runtime policy (hasSupabaseConfig) so a new accepted
// variable name cannot silently diverge parsing from policy.
import { SUPABASE_ANON_KEYS, SUPABASE_SERVICE_KEYS, SUPABASE_URL_KEYS } from "./runtime";

export interface GetLibConfig {
  tokenLimit: number;
  maxTokenLimit: number;
  cacheTtlMs: number;
  fetchTimeoutMs: number;
  deepFetchMaxPages: number;
  deepFetchRelevanceThreshold: number;
  deepFetchTimeoutMs: number;
  maxConcurrentFetches: number;
  toolTimeoutMs: number;
  swrStaleTtlMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
  logFormat: "json" | "text";
  logLevel: "debug" | "info" | "warn" | "error";
  githubToken: string | undefined;
  cacheDir: string;
  concurrency: number;
  watermarkDisabled: boolean;
  // Exact contract spelling per environment rules (section 24):
  // GETLIB_AUTHENTICATICATION_ENABLE. Keep it byte-identical - deployment
  // manifests and clients depend on the exact name.
  authEnabled: boolean;
  defaultAccount: string | undefined;
  defaultPass: string | undefined;
  sessionSecret: string | undefined;
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  supabaseServiceKey: string | undefined;
  // VERCEL_URL (deployment hostname) is owned here for the origin
  // allowlist. VERCEL_ENV/NODE_ENV environment signals are owned by
  // runtime.ts, which stays the single live reader so tests can inject
  // signals without fighting this frozen module-level config.
  vercelUrl: string | undefined;
  allowedHosts: string[];
}

function emptyToUndefined(raw: string | undefined): string | undefined {
  if (raw === undefined || raw.trim().length === 0) return undefined;
  return raw;
}

function intEnv(name: string, fallback: number, min = 0): number {
  const raw = emptyToUndefined(process.env[name]);
  if (raw === undefined) return fallback;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new Error(`Invalid ${name}: "${raw}" -- must be an integer >= ${min}`);
  }
  return parsed;
}

function floatEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = emptyToUndefined(process.env[name]);
  if (raw === undefined) return fallback;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid ${name}: "${raw}" -- must be a number between ${min} and ${max}`);
  }
  return parsed;
}

function enumEnv<T extends string>(name: string, fallback: T, allowed: readonly T[]): T {
  const raw = emptyToUndefined(process.env[name]);
  if (raw === undefined) return fallback;
  if (!allowed.includes(raw as T)) {
    throw new Error(`Invalid ${name}: "${raw}" -- must be one of: ${allowed.join(", ")}`);
  }
  return raw as T;
}

function stringEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = emptyToUndefined(process.env[name]);
  if (raw === undefined) return fallback;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  throw new Error(`Invalid ${name}: "${raw}" -- must be true or false`);
}

function cacheDirEnv(): string {
  const raw = stringEnv("GETLIB_CACHE_DIR");
  if (raw !== undefined) return raw;
  const home = stringEnv("HOME");
  if (home !== undefined) return `${home}/.getlib-mcp-cache`;
  return "/tmp/.getlib-mcp-cache";
}

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = stringEnv(name);
    if (value !== undefined) return value;
  }
  return undefined;
}

function allowedHostsEnv(): string[] {
  const raw = stringEnv("GETLIB_ALLOWED_HOSTS");
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

const baseConfig: GetLibConfig = {
  tokenLimit: intEnv("GETLIB_TOKEN_LIMIT", 8000),
  maxTokenLimit: intEnv("GETLIB_MAX_TOKEN_LIMIT", 20000),
  cacheTtlMs: intEnv("GETLIB_CACHE_TTL_MS", 30 * 60 * 1000),
  fetchTimeoutMs: intEnv("GETLIB_FETCH_TIMEOUT_MS", 15_000, 1),
  deepFetchMaxPages: intEnv("GETLIB_DEEP_FETCH_MAX_PAGES", 8, 1),
  deepFetchRelevanceThreshold: floatEnv("GETLIB_DEEP_FETCH_RELEVANCE_THRESHOLD", 0.3, 0, 1),
  deepFetchTimeoutMs: intEnv("GETLIB_DEEP_FETCH_TIMEOUT_MS", 25_000, 1),
  maxConcurrentFetches: intEnv("GETLIB_MAX_CONCURRENT_FETCHES", 12, 1),
  toolTimeoutMs: intEnv("GETLIB_TOOL_TIMEOUT_MS", 55_000, 1),
  swrStaleTtlMs: intEnv("GETLIB_SWR_STALE_TTL_MS", 60 * 60 * 1000, 1),
  circuitBreakerThreshold: intEnv("GETLIB_CIRCUIT_BREAKER_THRESHOLD", 3, 1),
  circuitBreakerResetMs: intEnv("GETLIB_CIRCUIT_BREAKER_RESET_MS", 60_000, 1),
  logFormat: enumEnv("GETLIB_LOG_FORMAT", "text", ["json", "text"] as const),
  logLevel: enumEnv("GETLIB_LOG_LEVEL", "info", ["debug", "info", "warn", "error"] as const),
  githubToken: stringEnv("GETLIB_GITHUB_TOKEN"),
  cacheDir: cacheDirEnv(),
  concurrency: intEnv("GETLIB_CONCURRENCY", 8, 1),
  watermarkDisabled: boolEnv("GETLIB_NO_WATERMARK", false),
  authEnabled: boolEnv("GETLIB_AUTHENTICATICATION_ENABLE", false),
  defaultAccount: stringEnv("GETLIB_DEFAULT_ACCOUNT"),
  defaultPass: stringEnv("GETLIB_DEFAULT_PASS"),
  sessionSecret: stringEnv("GETLIB_SESSION_SECRET"),
  supabaseUrl: firstEnv(...SUPABASE_URL_KEYS),
  supabaseAnonKey: firstEnv(...SUPABASE_ANON_KEYS),
  supabaseServiceKey: firstEnv(...SUPABASE_SERVICE_KEYS),
  vercelUrl: firstEnv("VERCEL_URL"),
  allowedHosts: allowedHostsEnv(),
};

/**
 * Test-only override for hermetic unit tests. Production code never calls
 * this - it exists so tests stay independent of the operator .env
 * (auth flags, bootstrap credentials, session secret). Values set here
 * take precedence over the frozen process-env snapshot until reset.
 */
let configOverride: Partial<GetLibConfig> | null = null;

export function setConfigOverride(override: Partial<GetLibConfig> | null): void {
  configOverride = override;
}

export function resetConfigOverride(): void {
  configOverride = null;
}

export const config: Readonly<GetLibConfig> = new Proxy(baseConfig, {
  get(target, property: string | symbol): unknown {
    if (typeof property === "string" && configOverride !== null && property in configOverride) {
      return (configOverride as Record<string, unknown>)[property];
    }
    return (target as unknown as Record<string | symbol, unknown>)[property];
  },
});
