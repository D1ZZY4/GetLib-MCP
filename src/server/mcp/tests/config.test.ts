import { describe, expect, test } from "bun:test";
import { config } from "../config";

describe("server config", () => {
  test("limits stay within valid ranges", () => {
    expect(config.tokenLimit).toBeGreaterThan(0);
    expect(config.maxTokenLimit).toBeGreaterThanOrEqual(config.tokenLimit);
    expect(config.fetchTimeoutMs).toBeGreaterThan(0);
    expect(config.maxConcurrentFetches).toBeGreaterThan(0);
  });

  test("documentation token budget follows the retrieval contract", () => {
    // Targeted lookups default to 10,000 tokens; wide-context retrieval
    // caps at 100,000. Pinned so the contract cannot drift silently.
    expect(config.tokenLimit).toBe(10_000);
    expect(config.maxTokenLimit).toBe(100_000);
  });

  test("log settings use known variants", () => {
    expect(["json", "text"]).toContain(config.logFormat);
    expect(["debug", "info", "warn", "error"]).toContain(config.logLevel);
  });

  test("auth variables keep their exact contract spelling", async () => {
    // Only canonical GETLIB_AUTHENTICATION_ENABLE is accepted; the deprecated
    // typo alias has been removed from runtime policy.
    const runtimeSource = await Bun.file(new URL("../runtime.ts", import.meta.url)).text();
    expect(runtimeSource).toContain('"GETLIB_AUTHENTICATION_ENABLE"');
    expect(runtimeSource).not.toContain('"GETLIB_AUTHENTICATICATION_ENABLE"');
    const configSource = await Bun.file(new URL("../config.ts", import.meta.url)).text();
    expect(configSource).toContain("AUTH_ENABLE_KEYS");
    expect(configSource).toContain('"GETLIB_DEFAULT_ACCOUNT"');
    expect(configSource).toContain('"GETLIB_DEFAULT_PASS"');
    expect(typeof config.authEnabled).toBe("boolean");
  });

  test("allowed hosts enforce bare hostnames", async () => {
    // Consumers match URL.hostname exactly, so entries carrying a scheme,
    // port, or path can never match and must fail fast at startup.
    const configSource = await Bun.file(new URL("../config.ts", import.meta.url)).text();
    expect(configSource).toContain("must be a bare hostname");
    expect(Array.isArray(config.allowedHosts)).toBe(true);
  });
});
