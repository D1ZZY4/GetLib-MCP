import { timingSafeEqual } from "crypto";
import { config } from "@/server/mcp/config";

export interface AuthConfigSnapshot {
  enabled: boolean;
}

/**
 * Public auth configuration. Never includes the default account name or
 * password - those stay server-side and are only used by verifyCredentials.
 */
export function getAuthConfig(): AuthConfigSnapshot {
  return { enabled: config.authEnabled };
}

function passwordsMatch(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate, "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verifies sign-in credentials against the configured default account.
 * Fail-closed: returns false unless authentication is enabled AND a
 * default account with password is configured AND both match.
 */
export function verifyCredentials(email: string, password: string): boolean {
  if (!config.authEnabled) return false;
  const account = config.defaultAccount;
  const expectedPass = config.defaultPass;
  if (!account || !expectedPass) return false;
  const emailOk = email.trim().toLowerCase() === account.trim().toLowerCase();
  return emailOk && passwordsMatch(password, expectedPass);
}
