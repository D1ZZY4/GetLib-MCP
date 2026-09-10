/**
 * Domain: authentication policy - pure business rules with no I/O.
 *
 * Decides which credentials are acceptable for a given runtime context.
 * Application code supplies the configured values and environment flags;
 * this module never reads process.env, Supabase, or Next.js state.
 */

export const FALLBACK_ACCOUNT = "awesomemcp@getlib-local.com";
export const FALLBACK_PASSWORD = "getlib123";

export const DEV_DEMO_ACCOUNT = "demo@getlibmcp.com";
export const DEV_DEMO_PASSWORD = "demo123";

export interface CredentialCandidate {
  account: string | undefined;
  password: string | undefined;
}

export interface ResolvedBootstrapCredentials {
  account: string;
  password: string;
  isFallback: boolean;
}

/**
 * Resolve effective bootstrap credentials. Empty configuration falls back
 * to the documented emergency defaults; callers must surface isFallback
 * as a dashboard warning and provide a rotation mechanism.
 *
 * Surrounding whitespace is trimmed from both values. Secrets injected via
 * environment (secret managers, .env files, deployment dashboards) commonly
 * carry an invisible trailing newline or space from copy-paste, which would
 * otherwise make the correct password permanently mismatch with no visible
 * cause. Passwords with meaningful leading/trailing spaces are not a
 * supported bootstrap use case.
 */
export function resolveBootstrapCredentials(candidate: CredentialCandidate): ResolvedBootstrapCredentials {
  const account = candidate.account?.trim();
  const password = candidate.password?.trim();
  if (account && account.length > 0 && password && password.length > 0) {
    return { account, password, isFallback: false };
  }
  return { account: FALLBACK_ACCOUNT, password: FALLBACK_PASSWORD, isFallback: true };
}

/**
 * Email equality for identity decisions: trim plus lowercase only.
 * No empty/Unicode contract beyond that - callers use it for equality,
 * never for deliverability.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isDevDemoCredentials(email: string, password: string): boolean {
  // Email is normalized but the password is exact: surrounding spaces in
  // secrets are user error, not intent (bootstrap trimming documents why).
  return normalizeEmail(email) === DEV_DEMO_ACCOUNT && password === DEV_DEMO_PASSWORD;
}

/**
 * Whether the dev demo identity may authenticate in this runtime context.
 * Production must never accept it. The explicit production guard makes
 * the impossible ("production", true) state fail closed even if a
 * caller ever passes inconsistent flags.
 */
export function isDevDemoAllowed(environment: "development" | "production", isMock: boolean): boolean {
  if (environment === "production") return false;
  return environment === "development" && isMock;
}

/**
 * Display identity derived from an address. Trims first so callers
 * cannot leak whitespace into UI; "@" yields "user", "a@b@c" yields "a".
 */
export function displayNameFor(email: string): string {
  return email.trim().split("@")[0] || "user";
}
