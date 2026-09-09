import { fetchJson } from "@/web/lib/api-client";

export interface RuntimeInfo {
  environment: "development" | "production";
  databaseMode: string;
  isMock: boolean;
  supabaseConfigured: boolean;
  nodeEnv: string | undefined;
  vercelEnv: string | undefined;
  auth: {
    enabled: boolean;
    fallbackActive: boolean;
    environment: string;
    databaseMode: string;
  };
  database: {
    mode: string;
    health: string;
    configured: boolean;
    latencyMs: number | null;
    error: string | null;
    checkedAt: string;
  };
  health: {
    status: string;
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
