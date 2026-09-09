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

/**
 * Derives the disabled-source id list from a server snapshot plus local
 * toggle overrides. Request shaping lives here (not in the hook) so the
 * body contract is unit-testable without React.
 */
export function buildSourcesBody(
  snapshot: SourcesSnapshot,
  toggles: Record<string, boolean>,
  blocked: string[],
  wildcards: string[],
): SourcesSettingsBody {
  return {
    disabled: snapshot.groups
      .flatMap((group) => group.items)
      .filter((source) => !(toggles[source.id] ?? source.enabled))
      .map((source) => source.id),
    blocked,
    wildcards,
  };
}
