import { fetchJson } from "./api-client";
import type { LibraryFetch } from "./ranking";

/**
 * Canonical statistics snapshot contract. Owned by shared UI lib:
 * consumed by the statistics feature and the dashboard overview alike,
 * so neither feature owns the cross-surface telemetry shape.
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
  isMock: boolean;
}

export function fetchStatistics(): Promise<StatisticsSnapshot> {
  return fetchJson<StatisticsSnapshot>("/api/management/statistics");
}
