import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resetConfigOverride, setConfigOverride } from "@/server/mcp/config";
import {
  clearSessionCookie,
  createSessionToken,
  requireManagementAuth,
  sessionCookieAttributes,
  sessionEmailFromRequest,
  UnauthorizedError,
  verifySessionToken,
} from "../auth/session";

// Hermetic against the operator .env: session behavior is tested with auth
// disabled and a deterministic signing secret, independent of production
// credentials or GETLIB_SESSION_SECRET presence.
beforeEach(() => {
  setConfigOverride({ authEnabled: false, sessionSecret: "test-session-secret" });
});

afterEach(() => {
  resetConfigOverride();
});

function requestWith(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/management/health", { headers });
}

describe("session tokens", () => {
  test("round-trips the email", () => {
    const token = createSessionToken("admin@example.com", 1_000_000);
    expect(verifySessionToken(token, 2_000_000)).toBe("admin@example.com");
  });

  test("rejects tampered payloads", () => {
    const token = createSessionToken("admin@example.com", 1_000_000);
    const signature = token.split(".")[2] ?? "";
    const forged = Buffer.from(
      JSON.stringify({ email: "root@example.com", exp: 2_000_000 }),
      "utf-8",
    ).toString("base64url");
    expect(verifySessionToken(`v1.${forged}.${signature}`, 1_500_000)).toBeNull();
  });

  test("rejects expired tokens", () => {
    const token = createSessionToken("admin@example.com", 1_000_000);
    expect(verifySessionToken(token, 1_000_000 + 13 * 60 * 60 * 1000)).toBeNull();
  });

  test("rejects malformed tokens", () => {
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("v1.broken")).toBeNull();
    expect(verifySessionToken("v2.e30.00")).toBeNull();
  });
});

describe("session extraction", () => {
  test("reads the cookie first", () => {
    const token = createSessionToken("admin@example.com");
    const email = sessionEmailFromRequest(
      requestWith({ cookie: `other=1; getlib_session=${encodeURIComponent(token)}` }),
    );
    expect(email).toBe("admin@example.com");
  });

  test("falls back to bearer tokens", () => {
    const token = createSessionToken("admin@example.com");
    const email = sessionEmailFromRequest(requestWith({ authorization: `Bearer ${token}` }));
    expect(email).toBe("admin@example.com");
  });

  test("returns null without credentials", () => {
    expect(sessionEmailFromRequest(requestWith())).toBeNull();
    expect(
      sessionEmailFromRequest(requestWith({ authorization: "Bearer nonsense" })),
    ).toBeNull();
  });
});

describe("management authorization boundary", () => {  test("allows anonymous context when authentication is disabled", async () => {
    // Default test env leaves GETLIB_AUTHENTICATICATION_ENABLE unset (false).
    await expect(requireManagementAuth(requestWith(), { verifyApiKey: async () => null })).resolves.toEqual({
      email: null,
    });
  });

  test("rejects unauthenticated callers when authentication is enabled", async () => {
    setConfigOverride({ authEnabled: true, sessionSecret: "test-session-secret" });
    await expect(
      requireManagementAuth(requestWith(), { verifyApiKey: async () => null }),
    ).rejects.toThrow(UnauthorizedError);
  });

  test("accepts a valid API key when authentication is enabled", async () => {
    setConfigOverride({ authEnabled: true, sessionSecret: "test-session-secret" });
    const deps = {
      verifyApiKey: async (presented: string) =>
        presented === "glk_live" ? { id: 7, name: "ci" } : null,
    };
    await expect(
      requireManagementAuth(requestWith({ authorization: "Bearer glk_live" }), deps),
    ).resolves.toEqual({ email: null, apiKey: { id: 7, name: "ci" } });
    await expect(
      requireManagementAuth(requestWith({ authorization: "Bearer glk_dead" }), deps),
    ).rejects.toThrow(UnauthorizedError);
  });

  test("UnauthorizedError carries a neutral message", () => {
    const error = new UnauthorizedError();
    expect(error.message).not.toMatch(/password|secret|token/i);
  });
});

describe("session cookie attributes", () => {
  test("clearing mirrors creation attributes with zero lifetime", () => {
    const cleared = clearSessionCookie();
    expect(cleared).toStartWith("getlib_session=;");
    expect(cleared).toContain("Max-Age=0");
    expect(cleared).toContain("HttpOnly");
    expect(cleared).toContain("SameSite=Lax");
    // Same Path and Secure semantics as issuance, otherwise browsers keep
    // the Secure production cookie alive after sign-out.
    expect(cleared).toContain("Path=/;");
    const issuedSecure = sessionCookieAttributes().includes("Secure");
    expect(cleared.includes("Secure")).toBe(issuedSecure);
  });
});
