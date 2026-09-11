"use client";

import { useApiData } from "./use-api-data";
import { fetchStatistics } from "../lib/statistics";

/**
 * Shared statistics snapshot hook. Owned by shared UI hooks: the
 * statistics page and the dashboard overview consume the same live
 * telemetry without either feature depending on the other.
 */
export function useStatisticsData() {
  const { data, loading, error, retry } = useApiData(
    fetchStatistics,
    "We couldn't load statistics. Try again in a moment.",
    { refreshIntervalMs: 15_000 },
  );
  return { stats: data, loading, error, retry };
}
