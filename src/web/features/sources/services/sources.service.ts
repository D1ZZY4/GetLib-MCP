import { fetchJson, putJson } from "@/web/lib/api-client";

export interface SourceItem {
  id: string;
  name: string;
  description: string;
  entries: number;
  enabled: boolean;
}

export interface SourceGroup {
  id: string;
  title: string;
  description: string;
  items: SourceItem[];
}

export interface SourcesSnapshot {
  groups: SourceGroup[];
  totalEntries: number;
  registryEntries: number;
  blocked: string[];
  wildcards: string[];
}

export interface SourcesSettingsBody {
  disabled: string[];
  blocked: string[];
  wildcards: string[];
}

export function fetchSources(): Promise<SourcesSnapshot> {
  return fetchJson<SourcesSnapshot>("/api/management/sources");
}

export function saveSources(body: SourcesSettingsBody): Promise<SourcesSnapshot> {
  return putJson<SourcesSnapshot>("/api/management/sources", body);
}
