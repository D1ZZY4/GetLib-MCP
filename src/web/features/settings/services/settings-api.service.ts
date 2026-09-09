import { fetchJson } from "@/web/lib/api-client";

export interface SettingsSnapshot {
  general: {
    server: string;
    version: string;
    environment: "development" | "production";
  };
  authentication: {
    enabled: boolean;
    fallbackActive: boolean;
  };
  mcp: {
    transports: string[];
    tools: number;
    resources: number;
    prompts: number;
  };
  database: {
    mode: string;
    isMock: boolean;
    configured: boolean;
  };
}

export function fetchSettings(): Promise<SettingsSnapshot> {
  return fetchJson<SettingsSnapshot>("/api/management/settings");
}
