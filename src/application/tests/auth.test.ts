import { describe, expect, test } from "bun:test";
import { getAuthConfig, verifyCredentials } from "../auth/auth.service";

describe("auth application service", () => {
  test("config never leaks account or password", () => {
    const snapshot = getAuthConfig();
    expect(Object.keys(snapshot)).toEqual(["enabled"]);
    expect(typeof snapshot.enabled).toBe("boolean");
  });

  test("verification fails closed without configuration", () => {
    expect(verifyCredentials("admin@example.com", "secret")).toBe(false);
    expect(verifyCredentials("", "")).toBe(false);
  });
});
