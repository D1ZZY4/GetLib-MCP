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

export interface UsageStats {
  requestsUsed: number;
  docsPages: number;
  activeLibraries: number;
  successRate: number;
}

export interface StatisticsSnapshot {
  usage: UsageStats;
  days: UsageDay[];
  rows: LibraryStatRow[];
  fetches: LibraryFetch[];
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
    successRate: 99.2,
  };
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface OutcomePoint {
  tool: string;
  ts: number;
  success: boolean;
}

/**
 * Pure aggregation over one outcome list, shared by the durable and the
 * in-memory paths so both report identical metric definitions. Unit
 * tested without any database.
 */
export function summarizeOutcomePoints(points: OutcomePoint[]): {
  days: UsageDay[];
  fetches: LibraryFetch[];
  successRate: number;
} {
  const byDay = new Map<string, number>();
  for (const point of points) {
    const label = dayLabel(point.ts);
    byDay.set(label, (byDay.get(label) ?? 0) + 1);
  }
  const days: UsageDay[] = [...byDay.entries()].slice(-10).map(([date, requests]) => ({ date, requests }));
  const byTool = new Map<string, number>();
  for (const point of points) {
    byTool.set(point.tool, (byTool.get(point.tool) ?? 0) + 1);
  }
  const fetches: LibraryFetch[] = [...byTool.entries()].map(([tool, count]) => ({
    id: tool,
    name: tool,
    fetches: count,
  }));
  const successRate =
    points.length === 0 ? 100 : Math.round((points.filter((p) => p.success).length / points.length) * 1000) / 10;
  return { days, fetches, successRate };
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
  getRecentOutcomes: () => ReadonlyArray<Pick<InvocationOutcome, "tool" | "ts" | "success">>;
}

/**
 * Single definition of call totals for every surface (statistics page,
 * dashboard cards). Production reads durable storage; anything else uses
 * this isolate's in-memory telemetry. Never throws.
 */
export async function getTelemetryTotals(deps: StatisticsDeps): Promise<TelemetryTotals> {
  if (resolveDatabaseMode() === "supabase-production") {
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
  if (resolveDatabaseMode() !== "supabase-production") return null;
  try {
    const stored = await deps.getDatabase().listLogs(STATS_LOG_WINDOW);
    if (stored.length === 0) return null;
    return stored.map((entry) => ({
      tool: entry.name,
      ts: Date.parse(entry.timestamp),
      success: entry.ok,
    }));
  } catch (error) {
    log({ level: "warn", msg: "statistics.outcomes.fallback", error: String(error) });
    return null;
  }
}

function memoryOutcomePoints(deps: StatisticsDeps): OutcomePoint[] {
  return deps.getRecentOutcomes().map((o) => ({ tool: o.tool, ts: o.ts, success: o.success }));
}

export async function getStatisticsSnapshot(deps: StatisticsDeps): Promise<StatisticsSnapshot> {
  const runtime = getRuntimeSnapshot();
  if (runtime.isMock) {
    return { usage: mockUsage(), days: MOCK_DAYS, rows: MOCK_ROWS, fetches: MOCK_FETCHES, isMock: true };
  }
  const totals = await getTelemetryTotals(deps);
  const points = (await durableOutcomePoints(deps)) ?? memoryOutcomePoints(deps);
  const { days, fetches, successRate: windowRate } = summarizeOutcomePoints(points);
  const usage: UsageStats = {
    requestsUsed: totals.totalCalls,
    docsPages: 0,
    activeLibraries: fetches.length,
    successRate: totals.totalCalls > 0 ? Math.round(totals.successRate * 1000) / 10 : windowRate,
  };
  return { usage, days, rows: [], fetches, isMock: false };
}
