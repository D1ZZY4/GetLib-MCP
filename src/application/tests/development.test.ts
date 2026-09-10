import { afterEach, describe, expect, test } from "bun:test";
import {
  getDevelopmentSettings,
  resetDevelopmentData,
  seedDevelopmentData,
  updateDatabaseMode,
} from "../development/development.service";
import { setDatabaseModeOverride } from "@/server/mcp/runtime";
import { resetDatabaseCache } from "@/server/mcp/infrastructure/database";
import { resetBootstrapCache } from "@/application/auth/auth.service";
import { liveDevelopmentDeps } from "@/server/mcp/infrastructure/deps/development-deps";

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

afterEach(() => {
  setDatabaseModeOverride(null);
  resetDatabaseCache();
  resetBootstrapCache();
});

describe("development application service", () => {
  test("exposes effective mode, env default, and override state", () => {
    const snapshot = getDevelopmentSettings();
    expect(["development", "production"]).toContain(snapshot.environment);
    expect(typeof snapshot.editable).toBe("boolean");
    expect(snapshot.availableModes).toEqual(["mock", "supabase"]);
    expect(typeof snapshot.supabaseConfigured).toBe("boolean");
    if (snapshot.environment === "development") {
      expect(snapshot.editable).toBe(true);
    }
  });

  test("realtime override switches the effective mode without restart", () => {
    withLibMode("development", () => {
      const before = getDevelopmentSettings();
      expect(before.editable).toBe(true);
      const next = before.databaseMode === "mock" ? "supabase" : "mock";
      const updated = updateDatabaseMode(next);
      expect(updated.override).toBe(next);
      expect(updated.databaseMode).toBe(next === "mock" ? "mock" : "supabase-development");
      const cleared = updateDatabaseMode(null);
      expect(cleared.override).toBeNull();
      expect(cleared.databaseMode).toBe(cleared.envDefault);
    });
  });

  test("production rejects mutations", () => {
    withLibMode("production", () => {
      expect(() => updateDatabaseMode("mock")).toThrow();
      expect(getDevelopmentSettings().editable).toBe(false);
    });
  });

  test("seed ensures settings in development", async () => {
    await withMockModeAsync(async () => {
      const snapshot = await seedDevelopmentData(liveDevelopmentDeps);
      expect(snapshot.editable).toBe(true);
    });
  });

  test("reset reseeds in development and rejects in production", async () => {
    await withMockModeAsync(async () => {
      const snapshot = await resetDevelopmentData(liveDevelopmentDeps);
      expect(snapshot.editable).toBe(true);
    });
    await withLibModeAsync("production", async () => {
      await expect(seedDevelopmentData(liveDevelopmentDeps)).rejects.toThrow();
      await expect(resetDevelopmentData(liveDevelopmentDeps)).rejects.toThrow();
    });
  });
});

async function withLibModeAsync(value: string | undefined, fn: () => Promise<void>): Promise<void> {
  const prev = process.env[KEY];
  try {
    if (value === undefined) delete process.env[KEY];
    else process.env[KEY] = value;
    await fn();
  } finally {
    if (prev === undefined) delete process.env[KEY];
    else process.env[KEY] = prev;
  }
}

// Mock-repository contract regardless of the local .env database mode:
// resolveDatabaseMode() reads the environment live on every call.
async function withMockModeAsync(fn: () => Promise<void>): Promise<void> {
  const prev = process.env.GETLIB_DATABASE_MODE;
  try {
    delete process.env.GETLIB_DATABASE_MODE;
    await withLibModeAsync("development", fn);
  } finally {
    if (prev === undefined) delete process.env.GETLIB_DATABASE_MODE;
    else process.env.GETLIB_DATABASE_MODE = prev;
  }
}
