import { timingSafeEqual } from "crypto";
import {
  displayNameFor,
  isDevDemoAllowed,
  isDevDemoCredentials,
  normalizeEmail,
  resolveBootstrapCredentials,
} from "@/domain/auth/policy";
import { getDatabase } from "@/server/mcp/infrastructure/database";
import { config } from "@/server/mcp/config";
import { detectEnvironment, resolveDatabaseMode } from "@/server/mcp/runtime";

export interface AuthConfigSnapshot {
  enabled: boolean;
  fallbackActive: boolean;
  environment: "development" | "production";
  databaseMode: string;
  displayName: string | null;
}

export interface BootstrapStatus {
  account: string;
  isFallback: boolean;
  credentialsChanged: boolean;
  initializedAt: string | null;
}

let bootstrapCache: BootstrapStatus | null = null;

/**
 * Public auth configuration. Never includes the default account name or
 * password - those stay server-side and are only used by verifyCredentials.
 * fallbackActive drives the dashboard warning that default credentials
 * must be rotated. displayName is the configured identity for the current
 * context (null when auth is disabled and no session exists).
 */
export function getAuthConfig(): AuthConfigSnapshot {
  const environment = detectEnvironment();
  const databaseMode = resolveDatabaseMode(environment);
  const bootstrap = resolveBootstrapCredentials({
    account: config.defaultAccount,
    password: config.defaultPass,
  });
  return {
    enabled: config.authEnabled,
    fallbackActive: bootstrap.isFallback,
    environment,
    databaseMode,
    displayName: config.authEnabled ? bootstrap.account : null,
  };
}

function passwordsMatch(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate, "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verifies sign-in credentials against the bootstrap account.
 *
 * Auth-disabled mode never authenticates here - the dashboard uses an
 * explicit anonymous/guest context instead of a fake user. Auth-enabled
 * mode accepts the configured (or fallback) bootstrap credentials, plus
 * the development demo identity only in development mock mode.
 * Fail-closed on every other input. Never logs passwords.
 */
export function verifyCredentials(email: string, password: string): boolean {
  if (!config.authEnabled) return false;
  const bootstrap = resolveBootstrapCredentials({
    account: config.defaultAccount,
    password: config.defaultPass,
  });
  const emailOk = normalizeEmail(email) === normalizeEmail(bootstrap.account);
  if (emailOk && passwordsMatch(password, bootstrap.password)) return true;
  const environment = detectEnvironment();
  const isMock = resolveDatabaseMode(environment) === "mock";
  if (isDevDemoAllowed(environment, isMock) && isDevDemoCredentials(email, password)) return true;
  return false;
}

export function displayNameForEmail(email: string): string {
  return displayNameFor(email);
}

/**
 * Idempotent bootstrap initialization. Runs once per process (not per
 * request) and persists the bootstrap record through the database
 * boundary when available. Duplicate calls return the cached status.
 */
export async function ensureBootstrapAccount(): Promise<BootstrapStatus> {
  if (bootstrapCache) return bootstrapCache;
  const bootstrap = resolveBootstrapCredentials({
    account: config.defaultAccount,
    password: config.defaultPass,
  });
  const now = new Date().toISOString();
  const status: BootstrapStatus = {
    account: bootstrap.account,
    isFallback: bootstrap.isFallback,
    credentialsChanged: false,
    initializedAt: now,
  };
  try {
    const db = getDatabase();
    const stored = await db.getBootstrap();
    if (stored) {
      bootstrapCache = {
        account: stored.account,
        isFallback: bootstrap.isFallback,
        credentialsChanged: stored.credentialsChanged,
        initializedAt: stored.updatedAt,
      };
      return bootstrapCache;
    }
    await db.saveBootstrap({
      account: bootstrap.account,
      credentialsChanged: false,
      updatedAt: now,
    });
  } catch {
    // Persistence is best-effort; the in-memory status still applies.
  }
  bootstrapCache = status;
  return bootstrapCache;
}

export function getBootstrapStatusSync(): BootstrapStatus {
  if (bootstrapCache) return bootstrapCache;
  const bootstrap = resolveBootstrapCredentials({
    account: config.defaultAccount,
    password: config.defaultPass,
  });
  return {
    account: bootstrap.account,
    isFallback: bootstrap.isFallback,
    credentialsChanged: false,
    initializedAt: null,
  };
}

/** Test hook - clears the cached bootstrap status. */
export function resetBootstrapCache(): void {
  bootstrapCache = null;
}
