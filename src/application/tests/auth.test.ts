import { describe, expect, test } from "bun:test";
import { resetConfigOverride, setConfigOverride } from "@/server/mcp/config";
import { getAuthConfig, signInUseCase, verifyCredentials } from "../auth/auth.service";

describe("auth application service", () => {
  test("config never leaks account or password", () => {
    const snapshot = getAuthConfig();
    const keys = Object.keys(snapshot);
    expect(keys).toContain("enabled");
    expect(keys).toContain("fallbackActive");
    expect(keys).toContain("environment");
    expect(keys).not.toContain("defaultAccount");
    expect(keys).not.toContain("account");
    expect(keys).not.toContain("password");
    expect(keys).not.toContain("defaultPass");
    expect(typeof snapshot.enabled).toBe("boolean");
    expect(JSON.stringify(snapshot).toLowerCase()).not.toContain("getlib123");
  });

  test("verification fails closed without configuration", () => {
    expect(verifyCredentials("admin@example.com", "secret")).toBe(false);
    expect(verifyCredentials("", "")).toBe(false);
  });

  test("rejection audit reveals the mismatched side without values", () => {
    const original = console.error;
    const captured: string[] = [];
    console.error = (...args: unknown[]) => {
      captured.push(args.map((part) => String(part)).join(" "));
    };
    try {
      setConfigOverride({
        authEnabled: true,
        defaultAccount: "ops@example.com",
        defaultPass: "CorrectHorse99",
      });
      expect(verifyCredentials("ops@example.com", "wrong")).toBe(false);
      expect(verifyCredentials("other@example.com", "CorrectHorse99")).toBe(false);
    } finally {
      console.error = original;
      resetConfigOverride();
    }
    const out = captured.join("\n");
    expect(out).toContain("auth.signin.rejected");
    expect(out).toMatch(/emailMatch["=:]true/);
    expect(out).toMatch(/emailMatch["=:]false/);
    expect(out).not.toContain("ops@example.com");
    expect(out).not.toContain("other@example.com");
    expect(out).not.toContain("CorrectHorse99");
  });

  test("signInUseCase resolves identity and trims without leaking", () => {
    try {
      setConfigOverride({
        authEnabled: true,
        defaultAccount: "ops@example.com",
        defaultPass: "CorrectHorse99",
      });
      expect(signInUseCase("  ops@example.com  ", "CorrectHorse99")).toEqual({
        name: "ops",
        email: "ops@example.com",
      });
      expect(signInUseCase("ops@example.com", "wrong")).toBeNull();
      expect(signInUseCase("other@example.com", "CorrectHorse99")).toBeNull();
    } finally {
      resetConfigOverride();
    }
  });
});
