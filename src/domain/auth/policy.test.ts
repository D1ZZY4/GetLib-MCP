import { describe, expect, test } from "bun:test";
import {
  DEV_DEMO_ACCOUNT,
  DEV_DEMO_PASSWORD,
  displayNameFor,
  FALLBACK_ACCOUNT,
  FALLBACK_PASSWORD,
  isDevDemoAllowed,
  isDevDemoCredentials,
  normalizeEmail,
  resolveBootstrapCredentials,
} from "./policy";

describe("bootstrap credential resolution", () => {
  test("empty config resolves to documented fallback defaults", () => {
    const resolved = resolveBootstrapCredentials({ account: undefined, password: undefined });
    expect(resolved).toEqual({
      account: FALLBACK_ACCOUNT,
      password: FALLBACK_PASSWORD,
      isFallback: true,
    });
  });

  test("blank account or missing password falls back", () => {
    expect(
      resolveBootstrapCredentials({ account: "   ", password: "secret123" }).isFallback,
    ).toBe(true);
    expect(resolveBootstrapCredentials({ account: "a@b.c", password: "" }).isFallback).toBe(
      true,
    );
    expect(
      resolveBootstrapCredentials({ account: "a@b.c", password: undefined }).isFallback,
    ).toBe(true);
  });

  test("explicit credentials are never fallback", () => {
    const resolved = resolveBootstrapCredentials({ account: "ops@example.com", password: "s3cret!" });
    expect(resolved.isFallback).toBe(false);
    expect(resolved.account).toBe("ops@example.com");
  });

  test("surrounding whitespace in secrets is trimmed, not a mismatch", () => {
    const resolved = resolveBootstrapCredentials({ account: "  ops@example.com  ", password: "s3cret!\n" });
    expect(resolved.isFallback).toBe(false);
    expect(resolved.account).toBe("ops@example.com");
    expect(resolved.password).toBe("s3cret!");
    expect(
      resolveBootstrapCredentials({ account: "a@b.c", password: "   " }).isFallback,
    ).toBe(true);
  });

  test("fallback constants match the documented bootstrap contract", () => {
    expect(FALLBACK_ACCOUNT).toBe("awesomemcp@getlib-local.com");
    expect(FALLBACK_PASSWORD).toBe("getlib123");
  });
});

describe("email normalization and display names", () => {
  test("normalizes case and surrounding whitespace", () => {
    expect(normalizeEmail("  Ops@Example.COM ")).toBe("ops@example.com");
  });

  test("display name is the local part", () => {
    expect(displayNameFor("ops@example.com")).toBe("ops");
    expect(displayNameFor("no-at-sign")).toBe("no-at-sign");
  });
});

describe("development demo identity", () => {
  test("demo constants match the documented development contract", () => {
    expect(DEV_DEMO_ACCOUNT).toBe("demo@getlibmcp.com");
    expect(DEV_DEMO_PASSWORD).toBe("demo123");
  });

  test("demo credentials match exactly after normalization", () => {
    expect(isDevDemoCredentials("demo@getlibmcp.com", "demo123")).toBe(true);
    expect(isDevDemoCredentials(" Demo@GetLibMCP.com ", "demo123")).toBe(true);
    expect(isDevDemoCredentials("demo@getlibmcp.com", "wrong")).toBe(false);
  });

  test("demo identity is only allowed in development mock mode", () => {
    expect(isDevDemoAllowed("development", true)).toBe(true);
    expect(isDevDemoAllowed("development", false)).toBe(false);
    expect(isDevDemoAllowed("production", true)).toBe(false);
    expect(isDevDemoAllowed("production", false)).toBe(false);
  });
});
