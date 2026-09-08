import { describe, expect, test } from "bun:test";
import { getAuthConfig, verifyCredentials } from "../auth/auth.service";

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
});
