import type { MockSession } from "@/web/types/library";

/**
 * Development demo identity for auth-disabled and mock flows.
 * Matches the domain dev-demo contract (demo@getlibmcp.com).
 * Production never accepts this identity - see domain/auth/policy.
 */
export const mockSession: MockSession = {
  name: "Demo User",
  email: "demo@getlibmcp.com",
};
