import { fetchJson, putJson } from "@/web/lib/api-client";

export type DatabaseModeOption = "mock" | "supabase";

export interface DevelopmentSettings {
  environment: "development" | "production";
  editable: boolean;
  databaseMode: string;
  envDefault: string;
  override: DatabaseModeOption | null;
  availableModes: DatabaseModeOption[];
  supabaseConfigured: boolean;
}

export function fetchDevelopmentSettings(): Promise<DevelopmentSettings> {
  return fetchJson<DevelopmentSettings>("/api/management/development");
}

export function updateDatabaseMode(mode: DatabaseModeOption | null): Promise<DevelopmentSettings> {
  return putJson<DevelopmentSettings>("/api/management/development", { mode });
}
