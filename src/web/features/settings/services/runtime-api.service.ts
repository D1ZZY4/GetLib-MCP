import { fetchJson } from "@/web/lib/api-client";
import type { HealthStatus } from "@/web/types/mcp";

export interface RuntimeInfo {
  environment: "development" | "production";
  databaseMode: "mock" | "supabase-development" | "supabase-production";
  isMock: boolean;
  supabaseConfigured: boolean;
  nodeEnv: string | undefined;
  vercelEnv: string | undefined;
  auth: {
    enabled: boolean;
    fallbackActive: boolean;
    environment: "development" | "production";
    databaseMode: string;
  };
  database: {
    mode: "mock" | "supabase-development" | "supabase-production";
    health: HealthStatus | "mock";
    configured: boolean;
    latencyMs: number | null;
    error: string | null;
    checkedAt: string;
  };
  health: {
    status: HealthStatus;
    name: string;
    version: string;
    uptimeSeconds: number;
    tools: number;
    resources: number;
    prompts: number;
    registryEntries: number;
    environment: string;
    databaseMode: string;
    isMock: boolean;
  };
}

export function fetchRuntimeInfo(): Promise<RuntimeInfo> {
  return fetchJson<RuntimeInfo>("/api/management/runtime");
}
