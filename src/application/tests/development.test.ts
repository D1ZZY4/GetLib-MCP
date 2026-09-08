import { afterEach, describe, expect, test } from "bun:test";
import {
  getDevelopmentSettings,
  updateDatabaseMode,
} from "../development/development.service";
import { setDatabaseModeOverride } from "@/server/mcp/runtime";

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
});
