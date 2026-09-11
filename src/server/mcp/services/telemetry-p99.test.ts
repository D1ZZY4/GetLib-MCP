import { describe, expect, test } from "bun:test";
import { getInvocationSummary, pushOutcome, resetTelemetry } from "./telemetry-outcomes";

describe("telemetry p99 observability", () => {
  test("byTool exposes p50, p95, and p99", () => {
    resetTelemetry();
    for (let i = 1; i <= 10; i++) {
      pushOutcome({ tool: "gl_search", requestId: `r${i}`, ts: Date.now(), durationMs: i * 10, success: true, cacheHit: false, resolved: true });
    }
    const summary = getInvocationSummary();
    const entry = summary.byTool["gl_search"];
    expect(entry).toBeDefined();
    expect(entry?.p50).toBeGreaterThan(0);
    expect(entry?.p95).toBeGreaterThanOrEqual(entry?.p50 ?? 0);
    expect(entry?.p99).toBeGreaterThanOrEqual(entry?.p95 ?? 0);
    resetTelemetry();
  });
});
