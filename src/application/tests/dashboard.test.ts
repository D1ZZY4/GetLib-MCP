import { describe, expect, test } from "bun:test";
import { getDashboardSnapshot } from "../dashboard/dashboard.service";
import { liveDashboardDeps } from "@/server/mcp/infrastructure/deps/dashboard-deps";

describe("dashboard application service", () => {
  test("returns operational overview with system, mcp, and database", async () => {
    const snapshot = await getDashboardSnapshot(liveDashboardDeps);
    expect(snapshot.system.environment).toMatch(/development|production/);
    expect(typeof snapshot.system.fallbackActive).toBe("boolean");
    expect(snapshot.mcp.tools).toBeGreaterThan(0);
    expect(snapshot.database.mode).toBe(snapshot.system.databaseMode as typeof snapshot.database.mode);
    expect(Array.isArray(snapshot.activities)).toBe(true);
    expect(Array.isArray(snapshot.attentions)).toBe(true);
  });

  test("operational warnings carry actions, not fake versions", async () => {
    const snapshot = await getDashboardSnapshot(liveDashboardDeps);
    for (const item of snapshot.attentions) {
      if (item.id === "att-fallback" || item.id === "att-db") {
        expect(item.installedVersion).toBeUndefined();
        expect(item.latestVersion).toBeUndefined();
        expect(typeof item.actionHref).toBe("string");
      }
    }
  });
  test("mock mode flags itself explicitly", async () => {
    const snapshot = await getDashboardSnapshot(liveDashboardDeps);
    if (snapshot.system.isMock) {
      expect(snapshot.isMock).toBe(true);
      expect(snapshot.libraries.length).toBeGreaterThan(0);
    }
  });
});
