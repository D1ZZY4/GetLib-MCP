import { describe, expect, test } from "bun:test";
import {
  createSessionToken,
  requireManagementAuth,
  sessionEmailFromRequest,
  UnauthorizedError,
  verifySessionToken,
} from "../auth/session";

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

describe("management authorization boundary", () => {
  test("allows anonymous context when authentication is disabled", () => {
    // Default test env leaves GETLIB_AUTHENTICATICATION_ENABLE unset (false).
    expect(requireManagementAuth(requestWith())).toEqual({ email: null });
  });

  test("UnauthorizedError carries a neutral message", () => {
    const error = new UnauthorizedError();
    expect(error.message).not.toMatch(/password|secret|token/i);
  });
});
