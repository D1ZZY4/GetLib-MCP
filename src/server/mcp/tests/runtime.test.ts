import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  detectEnvironment,
  getDatabaseModePolicy,
  getRuntimeSnapshot,
  resolveDatabaseMode,
  resolveEnvironment,
  setDatabaseModeOverride,
  validateProductionPolicy,
} from "../runtime";
import {
  FALLBACK_ACCOUNT,
  FALLBACK_PASSWORD,
  DEV_DEMO_ACCOUNT,
  DEV_DEMO_PASSWORD,
  isDevDemoAllowed,
  resolveBootstrapCredentials,
} from "@/domain/auth/policy";
import { getDatabase, resetDatabaseCache } from "../infrastructure/database";

afterEach(() => {
  resetDatabaseCache();
});

describe("GET_LIB_MODE environment switch", () => {
  const KEY = "GET_LIB_MODE";

  function withLibMode(value: string | undefined, fn: () => void): void {
    const prev = process.env[KEY];
    try {
      if (value === undefined) delete process.env[KEY];
      else process.env[KEY] = value;
      fn();
    } finally {
      if (prev === undefined) delete process.env[KEY];
      else process.env[KEY] = prev;
    }
  }

  test("manual switch wins over every auto signal", () => {
    expect(
      resolveEnvironment({ libMode: "development", vercelEnv: "production", nodeEnv: "production" }),
    ).toBe("development");
    expect(
      resolveEnvironment({ libMode: "production", vercelEnv: undefined, nodeEnv: "development" }),
    ).toBe("production");
  });

  test("auto-detects production from deployment metadata", () => {
    expect(
      resolveEnvironment({ libMode: undefined, vercelEnv: "production", nodeEnv: undefined }),
    ).toBe("production");
    expect(
      resolveEnvironment({ libMode: undefined, vercelEnv: undefined, nodeEnv: "production" }),
    ).toBe("production");
  });

  test("auto-detects development from dev/test signals", () => {
    expect(
      resolveEnvironment({ libMode: undefined, vercelEnv: undefined, nodeEnv: "development" }),
    ).toBe("development");
    expect(
      resolveEnvironment({ libMode: undefined, vercelEnv: "development", nodeEnv: undefined }),
    ).toBe("development");
    expect(resolveEnvironment({ libMode: undefined, vercelEnv: undefined, nodeEnv: "test" })).toBe(
      "development",
    );
  });

  test("defaults to production when empty and signal-free", () => {
    expect(
      resolveEnvironment({ libMode: undefined, vercelEnv: undefined, nodeEnv: undefined }),
    ).toBe("production");
    // Empty env behaves exactly like unset (readEnv filters it out).
    withLibMode("", () => {
      const viaEmpty = detectEnvironment();
      withLibMode(undefined, () => {
        expect(detectEnvironment()).toBe(viaEmpty);
      });
    });
  });

  test("honors explicit development and production from env", () => {
    withLibMode("development", () => {
      expect(detectEnvironment()).toBe("development");
    });
    withLibMode("production", () => {
      expect(detectEnvironment()).toBe("production");
    });
  });

  test("rejects invalid values fail-fast", () => {
    expect(() =>
      resolveEnvironment({ libMode: "staging", vercelEnv: undefined, nodeEnv: undefined }),
    ).toThrow("GET_LIB_MODE");
    withLibMode("staging", () => {
      expect(() => detectEnvironment()).toThrow("GET_LIB_MODE");
    });
  });
});

describe("runtime environment policy", () => {
  test("detects a valid environment", () => {
    expect(["development", "production"]).toContain(detectEnvironment());
  });

  test("production is fixed to real database mode", () => {
    expect(resolveDatabaseMode("production")).toBe("supabase-production");
  });

  test("development defaults to mock", () => {
    const snapshot = getRuntimeSnapshot();
    if (snapshot.environment === "development" && !process.env.GETLIB_DATABASE_MODE) {
      expect(snapshot.databaseMode).toBe("mock");
    }
  });

  test("realtime override switches development mode and resets cleanly", () => {
    try {
      setDatabaseModeOverride("supabase");
      expect(resolveDatabaseMode("development")).toBe("supabase-development");
      const policy = getDatabaseModePolicy("development");
      expect(policy.override).toBe("supabase");
      expect(policy.effective).toBe("supabase-development");
      setDatabaseModeOverride("mock");
      expect(resolveDatabaseMode("development")).toBe("mock");
    } finally {
      setDatabaseModeOverride(null);
    }
    expect(getDatabaseModePolicy("development").override).toBeNull();
  });

  test("production ignores the realtime override", () => {
    try {
      setDatabaseModeOverride("mock");
      expect(resolveDatabaseMode("production")).toBe("supabase-production");
      expect(getDatabaseModePolicy("production").effective).toBe("supabase-production");
    } finally {
      setDatabaseModeOverride(null);
    }
  });

  test("production policy throws without supabase config", () => {
    expect(() =>
      validateProductionPolicy({
        environment: "production",
        databaseMode: "supabase-production",
        isMock: false,
        supabaseConfigured: false,
        vercelEnv: "production",
        nodeEnv: "production",
      }),
    ).toThrow();
  });
});

describe("auth domain policy", () => {
  test("empty config falls back to documented defaults", () => {
    const resolved = resolveBootstrapCredentials({ account: undefined, password: undefined });
    expect(resolved.account).toBe(FALLBACK_ACCOUNT);
    expect(resolved.password).toBe(FALLBACK_PASSWORD);
    expect(resolved.isFallback).toBe(true);
  });

  test("explicit config is not fallback", () => {
    const resolved = resolveBootstrapCredentials({ account: "a@b.c", password: "secret123" });
    expect(resolved.isFallback).toBe(false);
  });

  test("dev demo only allowed in development mock mode", () => {
    expect(isDevDemoAllowed("development", true)).toBe(true);
    expect(isDevDemoAllowed("production", false)).toBe(false);
    expect(isDevDemoAllowed("development", false)).toBe(false);
    expect(DEV_DEMO_ACCOUNT).toBe("demo@getlibmcp.com");
    expect(DEV_DEMO_PASSWORD).toBe("demo123");
  });
});

describe("database boundary", () => {
  // Hermetic against the operator .env: the mock contract is a development
  // concern, so force development regardless of local GET_LIB_MODE.
  const savedLibMode = process.env.GET_LIB_MODE;
  beforeEach(() => {
    process.env.GET_LIB_MODE = "development";
  });
  afterAll(() => {
    if (savedLibMode === undefined) delete process.env.GET_LIB_MODE;
    else process.env.GET_LIB_MODE = savedLibMode;
  });

  test("mock repository round-trips bootstrap records", async () => {
    const db = getDatabase("mock");
    expect(db.mode).toBe("mock");
    const status = await db.getStatus();
    expect(status.health).toBe("mock");
    await db.saveBootstrap({ account: "a@b.c", credentialsChanged: false, updatedAt: new Date().toISOString() });
    const stored = await db.getBootstrap();
    expect(stored?.account).toBe("a@b.c");
  });

  test("mock repository accepts durable log writes without throwing", async () => {
    const db = getDatabase("mock");
    await db.saveLog({ kind: "tool", name: "gl_search", durationMs: 12, ok: true });
    await db.saveLog({ kind: "tool", name: "gl_search", durationMs: 3, ok: false });
    expect((await db.getStatus()).health).toBe("mock");
  });

  test("mock repository reads logs back newest first within the limit", async () => {
    const db = getDatabase("mock");
    await db.saveLog({ kind: "tool", name: "gl_search", durationMs: 12, ok: true });
    await db.saveLog({ kind: "http", name: "gl_docs", durationMs: 3, ok: false });
    const listed = await db.listLogs(1);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.name).toBe("gl_docs");
    expect(typeof listed[0]?.id).toBe("number");
    expect(typeof listed[0]?.timestamp).toBe("string");
  });
});
