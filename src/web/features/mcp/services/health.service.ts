import { fetchJson } from "@/web/lib/api-client";
import type { HealthSnapshot } from "@/web/types/mcp";

export async function fetchHealth(): Promise<HealthSnapshot> {
  return fetchJson<HealthSnapshot>("/api/management/health");
}
