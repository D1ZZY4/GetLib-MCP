import { describe, expect, test } from "bun:test";
import { getRuntimeInfo } from "../runtime/runtime.service";

describe("runtime application service", () => {
  test("exposes environment, database mode, auth, and health", async () => {
    const snapshot = await getRuntimeInfo();
    expect(["development", "production"]).toContain(snapshot.environment);
    expect(typeof snapshot.databaseMode).toBe("string");
    expect(typeof snapshot.isMock).toBe("boolean");
    expect(typeof snapshot.supabaseConfigured).toBe("boolean");
    expect(typeof snapshot.auth.enabled).toBe("boolean");
    expect(snapshot.database.mode).toBe(snapshot.databaseMode as typeof snapshot.database.mode);
    expect(snapshot.health.tools).toBeGreaterThan(0);
  });

  test("production never reports mock mode", async () => {
    const snapshot = await getRuntimeInfo();
    if (snapshot.environment === "production") {
      expect(snapshot.isMock).toBe(false);
      expect(snapshot.databaseMode).toBe("supabase-production");
    }
  });
});
