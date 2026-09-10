import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resetBootstrapCache } from "@/application/auth/auth.service";
import { resetConfigOverride, setConfigOverride } from "../config";
import { resetDatabaseCache } from "../infrastructure/database";
import { initializeApplication, resetInitialization } from "../init";

// Hermetic against the operator .env: initialization is exercised in
// development regardless of local GET_LIB_MODE.
const savedLibMode = process.env.GET_LIB_MODE;
beforeEach(() => {
  process.env.GET_LIB_MODE = "development";
});
afterAll(() => {
  if (savedLibMode === undefined) delete process.env.GET_LIB_MODE;
  else process.env.GET_LIB_MODE = savedLibMode;
});

afterEach(() => {
  resetInitialization();
  resetBootstrapCache();
  resetDatabaseCache();
  resetConfigOverride();
});

describe("application initialization lifecycle", () => {
  test("initializes idempotently without throwing", async () => {
    await initializeApplication();
    await initializeApplication();
  });

  test("bootstrap readiness log carries no secret material", async () => {
    const original = console.error;
    const captured: string[] = [];
    console.error = (...args: unknown[]) => {
      captured.push(args.map((part) => String(part)).join(" "));
    };
    try {
      setConfigOverride({ defaultAccount: "ops@example.com", defaultPass: "Sup3rLongPw" });
      resetBootstrapCache();
      resetInitialization();
      await initializeApplication();
    } finally {
      console.error = original;
      resetConfigOverride();
    }
    const out = captured.join("\n");
    expect(out).toContain("auth.bootstrap.ready");
    expect(out).not.toContain("ops@example.com");
    expect(out).not.toContain("Sup3rLongPw");
  });
});
