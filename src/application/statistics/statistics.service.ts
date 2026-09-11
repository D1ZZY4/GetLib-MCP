import { getRuntimeSnapshot, resolveDatabaseMode } from "@/server/mcp/runtime";
import type { DatabaseRepository } from "@/server/mcp/infrastructure/database";
import { OUTCOME_WINDOW, type InvocationOutcome } from "@/server/mcp/services/telemetry";
import { log } from "@/server/mcp/utils/logger";

/**
 * Statistics application service - server-side usage analytics shared by
 * Web, API, and MCP. Mock mode returns the historical deterministic demo
 * payload (flagged isMock); real modes aggregate durable log storage so
 * numbers survive serverless isolates, falling back to in-memory telemetry
 * only when durable storage is unreachable or still empty.
 */

export interface UsageDay {
  date: string;
  requests: number;
}

export interface LibraryStatRow {
  id: string;
  name: string;
  installedVersion: string;
  latestVersion: string;
  status: string;
  docsPages: number;
}

export interface LibraryFetch {
  id: string;
  name: string;
  fetches: number;
}

/** One library ranked by real tool usage: calls, success share, last use. */
export interface LibraryUsage {
  id: string;
  name: string;
  uses: number;
  /** 0-1 fraction, same scale as the other rates on this page. */
  successRate: number;
  /** ISO-8601 timestamp of the newest call about this library. */
  lastUsedAt: string;
}

export interface UsageStats {
  requestsUsed: number;
  docsPages: number;
  activeLibraries: number;
  /** 0-1 fraction, same scale as telemetry and dashboard rates. */
  successRate: number;
}

export interface StatisticsSnapshot {
  usage: UsageStats;
  days: UsageDay[];
  rows: LibraryStatRow[];
  fetches: LibraryFetch[];
  libraries: LibraryUsage[];
  isMock: boolean;
}

const MOCK_DAYS: UsageDay[] = [
  { date: "Aug 29", requests: 4 },
  { date: "Aug 30", requests: 7 },
  { date: "Aug 31", requests: 3 },
  { date: "Sep 1", requests: 9 },
  { date: "Sep 2", requests: 12 },
  { date: "Sep 3", requests: 6 },
  { date: "Sep 4", requests: 11 },
  { date: "Sep 5", requests: 15 },
  { date: "Sep 6", requests: 8 },
  { date: "Sep 7", requests: 24 },
];

const MOCK_FETCHES: LibraryFetch[] = [
  { id: "react", name: "react", fetches: 42 },
  { id: "tailwindcss", name: "tailwindcss", fetches: 31 },
  { id: "supabase-js", name: "@supabase/supabase-js", fetches: 18 },
  { id: "mcp-sdk", name: "@modelcontextprotocol/sdk", fetches: 12 },
  { id: "example-vuln", name: "example-legacy-auth", fetches: 4 },
];

const MOCK_LIBRARIES: LibraryUsage[] = [
  { id: "facebook/react", name: "facebook/react", uses: 38, successRate: 1, lastUsedAt: "2026-09-07T12:00:00.000Z" },
  { id: "tailwindlabs/tailwindcss", name: "tailwindlabs/tailwindcss", uses: 27, successRate: 0.963, lastUsedAt: "2026-09-07T11:00:00.000Z" },
  { id: "supabase/supabase", name: "supabase/supabase", uses: 15, successRate: 1, lastUsedAt: "2026-09-06T12:00:00.000Z" },
];

const MOCK_ROWS: LibraryStatRow[] = [
  { id: "react", name: "react", installedVersion: "19.2.0", latestVersion: "19.2.0", status: "up-to-date", docsPages: 48 },
  { id: "tailwindcss", name: "tailwindcss", installedVersion: "4.0.0", latestVersion: "4.1.13", status: "outdated", docsPages: 36 },
  { id: "supabase-js", name: "@supabase/supabase-js", installedVersion: "2.57.4", latestVersion: "2.116.0", status: "outdated", docsPages: 29 },
  { id: "mcp-sdk", name: "@modelcontextprotocol/sdk", installedVersion: "1.12.0", latestVersion: "1.30.0", status: "outdated", docsPages: 22 },
  { id: "example-vuln", name: "example-legacy-auth", installedVersion: "1.4.2", latestVersion: "2.0.1", status: "vulnerable", docsPages: 6 },
];

function mockUsage(): UsageStats {
  return {
    requestsUsed: 99,
    docsPages: MOCK_ROWS.reduce((total, row) => total + row.docsPages, 0),
    activeLibraries: MOCK_ROWS.length,
    successRate: 0.992,
  };
}

interface OutcomePoint {
  tool: string;
  ts: number;
  success: boolean;
  subject?: string | null;
}

/**
 * Pure aggregation over one outcome list, shared by the durable and the
 * in-memory paths so both report identical metric definitions. Unit
 * tested without any database.
 */
export function summarizeOutcomePoints(points: OutcomePoint[]): {
  days: UsageDay[];
  fetches: LibraryFetch[];
  libraries: LibraryUsage[];
  /** 0-1 fraction; 1 when there are no points (neutral, like the telemetry summary). */
  successRate: number;
} {
  const byDay = new Map<string, number>();
  const ordered = [...points].sort((a, b) => a.ts - b.ts);
  for (const point of ordered) {
    // ISO day key so Dec 31 of different years never merge; the display
    // label stays short month/day for chart fit.
    const key = new Date(point.ts).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const days: UsageDay[] = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .slice(-10)
    .map(([key, requests]) => {
      const [, month, day] = key.split("-");
      const label = new Date(Date.UTC(2020, Number(month) - 1, Number(day))).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", timeZone: "UTC" },
      );
      return { date: label, requests };
    });
  const byTool = new Map<string, number>();
  for (const point of points) {
    byTool.set(point.tool, (byTool.get(point.tool) ?? 0) + 1);
  }
  const fetches: LibraryFetch[] = [...byTool.entries()].map(([tool, count]) => ({
    id: tool,
    name: tool,
    fetches: count,
  }));
  // Most-used libraries: only calls with a recorded subject count, ranked
  // by uses. Rows without a subject (old logs, non-library tools) keep
  // feeding the tool ranking above and never dilute this one.
  const byLibrary = new Map<string, { uses: number; success: number; lastUsedAt: number }>();
  for (const point of points) {
    if (point.subject === undefined || point.subject === null || point.subject.length === 0) continue;
    const entry = byLibrary.get(point.subject) ?? { uses: 0, success: 0, lastUsedAt: 0 };
    entry.uses += 1;
    if (point.success) entry.success += 1;
    if (point.ts > entry.lastUsedAt) entry.lastUsedAt = point.ts;
    byLibrary.set(point.subject, entry);
  }
  const libraries: LibraryUsage[] = [...byLibrary.entries()]
    .map(([id, entry]) => ({
      id,
      name: id,
      uses: entry.uses,
      successRate: Math.round((entry.success / entry.uses) * 1000) / 1000,
      lastUsedAt: new Date(entry.lastUsedAt).toISOString(),
    }))
    .sort((a, b) => b.uses - a.uses || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const successRate =
    points.length === 0 ? 1 : Math.round((points.filter((p) => p.success).length / points.length) * 1000) / 1000;
  return { days, fetches, libraries, successRate };
}

// Bounded recent window for charts and per-tool counts. Totals come from
// countLogs so they are never windowed. Same value as the in-memory
// outcome ring (OUTCOME_WINDOW, the single window definition) so durable
// and memory paths aggregate identical history.
const STATS_LOG_WINDOW = OUTCOME_WINDOW;

interface TelemetryTotals {
  totalCalls: number;
  successRate: number;
  errorRate: number;
}

/**
 * Capability seams of the statistics snapshot. Durable reads and the
 * in-memory telemetry window are infrastructure injected here; runtime
 * policy, metric definitions, and logging stay directly owned.
 */
export interface StatisticsDeps {
  getDatabase: () => Pick<DatabaseRepository, "countLogs" | "listLogs">;
  getInvocationSummary: () => TelemetryTotals;
  getRecentOutcomes: () => ReadonlyArray<Pick<InvocationOutcome, "tool" | "ts" | "success" | "subject">>;
}

/**
 * Single definition of call totals for every surface (statistics page,
 * dashboard cards). Production reads durable storage; anything else uses
 * this isolate's in-memory telemetry. Never throws.
 */
export async function getTelemetryTotals(deps: StatisticsDeps): Promise<TelemetryTotals> {
  // Any real database mode reads durable storage (see dashboard note).
  if (resolveDatabaseMode() !== "mock") {
    try {
      const [total, stored] = await Promise.all([
        deps.getDatabase().countLogs(),
        deps.getDatabase().listLogs(STATS_LOG_WINDOW),
      ]);
      if (total > 0 && stored.length > 0) {
        const ok = stored.filter((entry) => entry.ok).length;
        const successRate = ok / stored.length;
        return { totalCalls: total, successRate, errorRate: 1 - successRate };
      }
    } catch (error) {
      log({ level: "warn", msg: "statistics.totals.fallback", error: String(error) });
      // Fall through to in-memory telemetry below.
    }
  }
  const summary = deps.getInvocationSummary();
  return { totalCalls: summary.totalCalls, successRate: summary.successRate, errorRate: summary.errorRate };
}

async function durableOutcomePoints(deps: StatisticsDeps): Promise<OutcomePoint[] | null> {
  if (resolveDatabaseMode() === "mock") return null;
  try {
    const stored = await deps.getDatabase().listLogs(STATS_LOG_WINDOW);
    if (stored.length === 0) return null;
    return stored.map((entry) => ({
      tool: entry.name,
      ts: Date.parse(entry.timestamp),
      success: entry.ok,
      subject: entry.subject ?? null,
    }));
  } catch (error) {
    log({ level: "warn", msg: "statistics.outcomes.fallback", error: String(error) });
    return null;
  }
}

function memoryOutcomePoints(deps: StatisticsDeps): OutcomePoint[] {
  return deps.getRecentOutcomes().map((o) => ({
    tool: o.tool,
    ts: o.ts,
    success: o.success,
    subject: o.subject ?? null,
  }));
}

export async function getStatisticsSnapshot(deps: StatisticsDeps): Promise<StatisticsSnapshot> {
  const runtime = getRuntimeSnapshot();
  if (runtime.isMock) {
    return { usage: mockUsage(), days: MOCK_DAYS, rows: MOCK_ROWS, fetches: MOCK_FETCHES, libraries: MOCK_LIBRARIES, isMock: true };
  }
  const totals = await getTelemetryTotals(deps);
  const points = (await durableOutcomePoints(deps)) ?? memoryOutcomePoints(deps);
  const { days, fetches, libraries, successRate: windowRate } = summarizeOutcomePoints(points);
  const usage: UsageStats = {
    requestsUsed: totals.totalCalls,
    docsPages: 0,
    activeLibraries: fetches.length,
    successRate: totals.totalCalls > 0 ? Math.round(totals.successRate * 1000) / 1000 : windowRate,
  };
  return { usage, days, rows: [], fetches, libraries, isMock: false };
}
