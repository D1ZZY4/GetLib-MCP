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
});
