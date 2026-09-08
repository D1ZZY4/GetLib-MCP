import type { HealthSnapshot } from "@/application/health/health.service";

export async function fetchHealth(): Promise<HealthSnapshot> {
  const response = await fetch("/api/management/health");
  if (!response.ok) {
    throw new Error(`Health API error: HTTP ${response.status}`);
  }
  return (await response.json()) as HealthSnapshot;
}
