import { getRuntimeSnapshot } from "@/server/mcp/runtime";
import { getInvocationSummary, getRecentOutcomes } from "@/server/mcp/services/telemetry-outcomes";

/**
 * Statistics application service - server-side usage analytics shared by
 * Web, API, and MCP. Mock mode returns the historical deterministic demo
 * payload (flagged isMock); real modes aggregate live telemetry so every
 * surface uses one metric definition.
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

export function getStatisticsSnapshot(): StatisticsSnapshot {
  const runtime = getRuntimeSnapshot();
  if (runtime.isMock) {
    return { usage: mockUsage(), days: MOCK_DAYS, rows: MOCK_ROWS, fetches: MOCK_FETCHES, isMock: true };
  }
  const summary = getInvocationSummary();
  const outcomes = getRecentOutcomes();
  const byDay = new Map<string, number>();
  for (const o of outcomes) {
    const label = dayLabel(o.ts);
    byDay.set(label, (byDay.get(label) ?? 0) + 1);
  }
  const days: UsageDay[] = [...byDay.entries()].slice(-10).map(([date, requests]) => ({ date, requests }));
  const byTool = new Map<string, number>();
  for (const o of outcomes) {
    byTool.set(o.tool, (byTool.get(o.tool) ?? 0) + 1);
  }
  const fetches: LibraryFetch[] = [...byTool.entries()].map(([tool, fetches]) => ({
    id: tool,
    name: tool,
    fetches,
  }));
  return {
    usage: {
      requestsUsed: summary.totalCalls,
      docsPages: 0,
      activeLibraries: Object.keys(summary.byTool).length,
      successRate: Math.round(summary.successRate * 1000) / 10,
    },
    days,
    rows: [],
    fetches,
    isMock: false,
  };
}
