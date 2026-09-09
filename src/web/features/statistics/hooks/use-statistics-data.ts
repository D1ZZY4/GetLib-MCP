"use client";

import { useApiData } from "@/web/hooks/use-api-data";
import { fetchStatistics } from "../services/statistics-api.service";

export function useStatisticsData() {
  const { data, loading, error, retry } = useApiData(
    fetchStatistics,
    "We couldn't load statistics. Try again in a moment.",
    { refreshIntervalMs: 15_000 },
  );
  return { stats: data, loading, error, retry };
}
