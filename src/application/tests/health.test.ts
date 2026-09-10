import { describe, expect, test } from "bun:test";
import { getHealthSnapshot } from "../health/health.service";
import { getMcpCatalog } from "../mcp/mcp-catalog.service";
import { liveHealthDeps } from "@/server/mcp/infrastructure/deps/health-deps";
import { liveMcpCatalogDeps } from "@/server/mcp/infrastructure/deps/mcp-catalog-deps";

describe("health application service", () => {
  test("reports a healthy snapshot with live counts", async () => {
    const snapshot = await getHealthSnapshot(liveHealthDeps);
    expect(snapshot.status).toBe("healthy");
    expect(snapshot.name).toBe("getlib-mcp");
    expect(snapshot.tools).toBe(getMcpCatalog(liveMcpCatalogDeps).tools.length);
    expect(snapshot.registryEntries).toBeGreaterThan(100);
    expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  test("telemetry rates stay within 0 and 1", async () => {
    const { telemetry } = await getHealthSnapshot(liveHealthDeps);
    for (const rate of [telemetry.successRate, telemetry.resolveRate, telemetry.errorRate]) {
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    }
  });
});
