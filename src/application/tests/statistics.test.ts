import { describe, expect, test } from "bun:test";
import { MockDatabaseRepository } from "@/server/mcp/infrastructure/database/mock-repository";
import {
  getStatisticsSnapshot,
  getTelemetryTotals,
  summarizeOutcomePoints,
} from "../statistics/statistics.service";
import { liveStatisticsDeps } from "@/server/mcp/infrastructure/deps/statistics-deps";

describe("statistics application service", () => {
  test("returns usage, days, rows, and fetches with mock flag", async () => {
    const snapshot = await getStatisticsSnapshot(liveStatisticsDeps);
    expect(typeof snapshot.usage.requestsUsed).toBe("number");
    expect(Array.isArray(snapshot.days)).toBe(true);
    expect(Array.isArray(snapshot.fetches)).toBe(true);
    expect(typeof snapshot.isMock).toBe("boolean");
  });

  test("aggregates one outcome list into days, tools, and rate", () => {
    const day = new Date("2026-09-01T10:00:00Z").getTime();
    const { days, fetches, libraries, successRate } = summarizeOutcomePoints([
      { tool: "gl_search", ts: day, success: true },
      { tool: "gl_search", ts: day + 1000, success: true },
      { tool: "gl_docs", ts: day + 2000, success: false },
    ]);
    expect(days).toEqual([{ date: "Sep 1", requests: 3 }]);
    expect(fetches).toEqual([
      { id: "gl_search", name: "gl_search", fetches: 2 },
      { id: "gl_docs", name: "gl_docs", fetches: 1 },
    ]);
    expect(libraries).toEqual([]);
    expect(successRate).toBe(0.667);
  });

  test("ranks libraries with subjects by uses, skipping the rest", () => {
    const day = new Date("2026-09-01T10:00:00Z").getTime();
    const { libraries, fetches } = summarizeOutcomePoints([
      { tool: "gl_get_docs", ts: day, success: true, subject: "facebook/react" },
      { tool: "gl_get_docs", ts: day + 1000, success: false, subject: "facebook/react" },
      { tool: "gl_snippets", ts: day + 2000, success: true, subject: "colinhacks/zod" },
      { tool: "gl_search", ts: day + 3000, success: true },
    ]);
    expect(fetches).toHaveLength(3);
    expect(libraries).toEqual([
      {
        id: "facebook/react",
        name: "facebook/react",
        uses: 2,
        successRate: 0.5,
        lastUsedAt: new Date(day + 1000).toISOString(),
      },
      {
        id: "colinhacks/zod",
        name: "colinhacks/zod",
        uses: 1,
        successRate: 1,
        lastUsedAt: new Date(day + 2000).toISOString(),
      },
    ]);
  });

  test("empty outcomes report a neutral full rate", () => {
    const { days, fetches, successRate } = summarizeOutcomePoints([]);
    expect(days).toEqual([]);
    expect(fetches).toEqual([]);
    expect(successRate).toBe(1);
  });

  test("mock repository counts persisted logs for totals", async () => {
    const repo = new MockDatabaseRepository();
    expect(await repo.countLogs()).toBe(0);
    await repo.saveLog({ kind: "tool", name: "gl_search", durationMs: 12, ok: true });
    await repo.saveLog({ kind: "tool", name: "gl_docs", durationMs: 30, ok: false });
    expect(await repo.countLogs()).toBe(2);
    expect((await repo.listLogs(10)).length).toBe(2);
  });

  test("telemetry totals stay within valid ranges", async () => {
    const totals = await getTelemetryTotals(liveStatisticsDeps);
    expect(totals.totalCalls).toBeGreaterThanOrEqual(0);
    expect(totals.successRate).toBeGreaterThanOrEqual(0);
    expect(totals.successRate).toBeLessThanOrEqual(1);
    expect(totals.errorRate).toBeGreaterThanOrEqual(0);
    expect(totals.errorRate).toBeLessThanOrEqual(1);
  });
});
