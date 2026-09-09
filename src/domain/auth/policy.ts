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

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isDevDemoCredentials(email: string, password: string): boolean {
  return normalizeEmail(email) === DEV_DEMO_ACCOUNT && password === DEV_DEMO_PASSWORD;
}

/**
 * Whether the dev demo identity may authenticate in this runtime context.
 * Production must never accept it.
 */
export function isDevDemoAllowed(environment: "development" | "production", isMock: boolean): boolean {
  return environment === "development" && isMock;
}

export function displayNameFor(email: string): string {
  return email.split("@")[0] || "user";
}
