import { fetchJson } from "@/web/lib/api-client";

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

export function fetchStatistics(): Promise<StatisticsSnapshot> {
  return fetchJson<StatisticsSnapshot>("/api/management/statistics");
}

/**
 * Single ranking implementation for library fetch counts. Both the
 * dashboard overview and the statistics ranking view use this so the
 * sort order cannot drift between surfaces.
 */
export function rankLibraryFetches(fetches: LibraryFetch[], limit?: number): LibraryFetch[] {
  const ranked = [...fetches].sort((a, b) => b.fetches - a.fetches);
  return limit === undefined ? ranked : ranked.slice(0, limit);
}
