import { fetchJson } from "@/web/lib/api-client";
import type { LibraryFetch } from "@/web/lib/ranking";

// Re-exported from the shared ranking boundary so existing feature
// imports keep working while the single implementation lives in web/lib.
export { rankLibraryFetches } from "@/web/lib/ranking";
export type { LibraryFetch } from "@/web/lib/ranking";

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

export function fetchStatistics(): Promise<StatisticsSnapshot> {
  return fetchJson<StatisticsSnapshot>("/api/management/statistics");
}
