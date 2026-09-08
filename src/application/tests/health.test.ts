import { describe, expect, test } from "bun:test";
import { getHealthSnapshot } from "../health/health.service";
import { TOOL_COUNT } from "@/server/mcp/constants";
import "@/server/mcp/registry/registry-loader";

describe("health application service", () => {
  test("reports a healthy snapshot with live counts", () => {
    const snapshot = getHealthSnapshot();
    expect(snapshot.status).toBe("healthy");
    expect(snapshot.name).toBe("getlib-mcp");
    expect(snapshot.tools).toBe(TOOL_COUNT);
    expect(snapshot.registryEntries).toBeGreaterThan(100);
    expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  test("telemetry rates stay within 0 and 1", () => {
    const { telemetry } = getHealthSnapshot();
    for (const rate of [telemetry.successRate, telemetry.resolveRate, telemetry.errorRate]) {
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    }
  });
});
