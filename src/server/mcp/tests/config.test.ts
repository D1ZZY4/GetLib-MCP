import { describe, expect, test } from "bun:test";
import { config } from "../config";

describe("server config", () => {
  test("limits stay within valid ranges", () => {
    expect(config.tokenLimit).toBeGreaterThan(0);
    expect(config.maxTokenLimit).toBeGreaterThanOrEqual(config.tokenLimit);
    expect(config.fetchTimeoutMs).toBeGreaterThan(0);
    expect(config.maxConcurrentFetches).toBeGreaterThan(0);
  });

  test("log settings use known variants", () => {
    expect(["json", "text"]).toContain(config.logFormat);
    expect(["debug", "info", "warn", "error"]).toContain(config.logLevel);
  });

  test("auth variables keep their exact contract spelling", async () => {
    // Environment rules mandate these names byte-identically. This guards
    // against well-meaning renames breaking deployments and clients.
    const source = await Bun.file(new URL("../config.ts", import.meta.url)).text();
    expect(source).toContain('"GETLIB_AUTHENTICATICATION_ENABLE"');
    expect(source).toContain('"GETLIB_DEFAULT_ACCOUNT"');
    expect(source).toContain('"GETLIB_DEFAULT_PASS"');
    expect(typeof config.authEnabled).toBe("boolean");
  });
});
