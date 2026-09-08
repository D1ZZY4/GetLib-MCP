"use client";

import { useApiData } from "@/web/hooks/use-api-data";
import { fetchDashboard } from "../services/dashboard-api.service";

export function useDashboardData() {
  const { data, loading, error, retry } = useApiData(
    fetchDashboard,
    "We couldn't load the dashboard. Try again in a moment.",
  );
  return { dashboard: data, loading, error, retry };
}
