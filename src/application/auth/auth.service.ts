import {
  displayNameFor,
  isDevDemoAllowed,
  isDevDemoCredentials,
  normalizeEmail,
  resolveBootstrapCredentials,
} from "@/domain/auth/policy";
import { secretsEqual, sha256Hex } from "./hash";
import type { BootstrapRecord, DatabaseRepository } from "@/server/mcp/infrastructure/database";
import { config } from "@/server/mcp/config";
import { detectEnvironment, resolveDatabaseMode } from "@/server/mcp/runtime";
import { log } from "@/server/mcp/utils/logger";

export interface AuthConfigSnapshot {
  enabled: boolean;
  fallbackActive: boolean;
  environment: "development" | "production";
  databaseMode: string;
}

export interface BootstrapStatus {
  account: string;
  isFallback: boolean;
  credentialsChanged: boolean;
  initializedAt: string | null;
}

let bootstrapCache: BootstrapStatus | null = null;

/**
 * Public auth configuration. Never includes account names or passwords -
 * those stay server-side and are only used by verifyCredentials. Identity
 * display comes from the client session, never from this payload.
 * fallbackActive drives the dashboard warning that default credentials
 * must be rotated.
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
  };
}

function passwordsMatch(candidate: string, expected: string): boolean {
  return secretsEqual(candidate, expected);
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
  // Operator diagnostic only: tells server-log readers whether the email
  // or the password mismatched, without logging either value. The client
  // always gets the same neutral 401 so this reveals nothing to probers.
  log({ level: "warn", msg: "auth.signin.rejected", emailMatch: emailOk });
  return false;
}

/**
 * Identity display for the sign-in response. Route layer must not import
 * domain policy directly - presentation string stays behind this use case.
 */
export function getDisplayName(email: string): string {
  return displayNameFor(email.trim());
}

export interface SignInResult {
  name: string;
  email: string;
}

/**
 * Sign-in use case: verifies credentials and resolves the display
 * identity in one step so the route stays a thin validate/map layer.
 * Returns null for invalid credentials without revealing whether the
 * email or the password was wrong (the route maps that to a neutral
 * 401). Token issuance and cookie mechanics stay with the transport
 * adapter (session.ts + route), not here.
 */
export function signInUseCase(email: string, password: string): SignInResult | null {
  if (!verifyCredentials(email, password)) return null;
  const trimmed = email.trim();
  return { name: getDisplayName(trimmed), email: trimmed };
}

/**
 * Capability seams of the bootstrap use case. Persistence goes through
 * the repository contract injected here; credential resolution stays
 * domain-owned and environment detection stays runtime-owned.
 */
export interface AuthDeps {
  getDatabase: () => Pick<DatabaseRepository, "getBootstrap" | "saveBootstrap">;
}

export type { BootstrapRecord };

/**
 * Idempotent bootstrap initialization. Runs once per process (not per
 * request) and persists the bootstrap record through the database
 * boundary when available. Duplicate calls return the cached status.
 *
 * The persisted record is authoritative for the account identity: when the
 * configured env credentials differ from the stored row (operator rotated
 * credentials and restarted), the row is updated and credentialsChanged is
 * set so the dashboard warning clears. A failed write throws in production
 * (fail fast at startup) and falls back to memory in development.
 */
export async function ensureBootstrapAccount(deps: AuthDeps): Promise<BootstrapStatus> {
  if (bootstrapCache) return bootstrapCache;
  const bootstrap = resolveBootstrapCredentials({
    account: config.defaultAccount,
    password: config.defaultPass,
  });
  const now = new Date().toISOString();
  const passwordHash = sha256Hex(bootstrap.password);
  try {
    const db = deps.getDatabase();
    const stored = await db.getBootstrap();
    if (stored && stored.account === bootstrap.account) {
      if (stored.passwordHash !== null && stored.passwordHash !== passwordHash) {
        // Same-account password rotation: previously invisible because
        // identity keyed on the account name alone. Persist the new hash
        // and record the event so rotation is auditable.
        await db.saveBootstrap({
          account: stored.account,
          credentialsChanged: !bootstrap.isFallback,
          updatedAt: now,
          passwordHash,
        });
        log({ level: "info", msg: "auth.bootstrap.rotated", accountLength: stored.account.length });
      }
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
      credentialsChanged: !bootstrap.isFallback,
      updatedAt: now,
      passwordHash,
    });
  } catch (error) {
    if (detectEnvironment() === "production") {
      throw error;
    }
    // Development best-effort: the in-memory status still applies.
    log({ level: "warn", msg: "auth.bootstrap.persist-failed", error: String(error) });
  }
  bootstrapCache = {
    account: bootstrap.account,
    isFallback: bootstrap.isFallback,
    credentialsChanged: !bootstrap.isFallback,
    initializedAt: now,
  };
  return bootstrapCache;
}

/** Test hook - clears the cached bootstrap status. */
export function resetBootstrapCache(): void {
  bootstrapCache = null;
}
