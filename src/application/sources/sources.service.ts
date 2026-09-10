import type { SourceSettingsState } from "@/server/mcp/services/source-settings";

/** Re-exported so route error mapping stays in the application layer. */
export { SourceSettingsValidationError } from "@/server/mcp/services/source-settings";

export interface SourceSummaryItem {
  id: string;
  name: string;
  description: string;
  entries: number;
  enabled: boolean;
}

export interface SourceSummaryGroup {
  id: string;
  title: string;
  description: string;
  items: SourceSummaryItem[];
}

export interface SourcesSnapshot {
  groups: SourceSummaryGroup[];
  totalEntries: number;
  registryEntries: number;
  blocked: string[];
  wildcards: string[];
}

/**
 * Capability seams of the sources snapshot. Table sizes, the enabled
 * policy, and the persisted settings store are infrastructure injected
 * here; the grouping and render shape stay application-owned. Tables
 * arrive as counts (the only thing the snapshot reads), never as live
 * provider data.
 */
export interface SourcesDeps {
  tableCounts: {
    libraryRegistry: number;
    docUrlPatterns: number;
    bestPracticeUrls: number;
    topicUrls: number;
    migrationPaths: number;
    auditPatterns: number;
    fixTargets: number;
  };
  isSourceEnabled: (id: string) => boolean;
  getSourceSettings: () => SourceSettingsState;
  updateSourceSettings: (input: {
    disabled?: unknown;
    blocked?: unknown;
    wildcards?: unknown;
  }) => Promise<unknown>;
}

function item(
  deps: SourcesDeps,
  id: string,
  name: string,
  description: string,
  entries: number,
): SourceSummaryItem {
  return { id, name, description, entries, enabled: deps.isSourceEnabled(id) };
}

/**
 * Documentation sources actually wired into this MCP server process.
 * Counts are read live from the source tables, so the Sources settings
 * page always reflects the running server instead of static mock data.
 */
export function getSourcesSnapshot(deps: SourcesDeps): SourcesSnapshot {
  const groups: SourceSummaryGroup[] = [
    {
      id: "library",
      title: "Library registry",
      description: "Curated library entries backing resolve, docs, and snippets.",
      items: [
        item(
          deps,
          "library-registry",
          "Library registry",
          "Curated libraries with docs URLs, aliases, and package mappings.",
          deps.tableCounts.libraryRegistry,
        ),
      ],
    },
    {
      id: "documentation",
      title: "Documentation sources",
      description: "URL tables used to locate official docs and best practices.",
      items: [
        item(
          deps,
          "doc-url-patterns",
          "Doc URL patterns",
          "Per-library documentation URL patterns for direct fetching.",
          deps.tableCounts.docUrlPatterns,
        ),
        item(
          deps,
          "best-practice-urls",
          "Best-practice URLs",
          "Curated best-practice guides per library and topic.",
          deps.tableCounts.bestPracticeUrls,
        ),
        item(
          deps,
          "topic-urls",
          "Topic URLs",
          "Authoritative URLs for cross-cutting topics and standards.",
          deps.tableCounts.topicUrls,
        ),
      ],
    },
    {
      id: "guidance",
      title: "Guidance sources",
      description: "Migration, audit, and remediation knowledge tables.",
      items: [
        item(
          deps,
          "migration-paths",
          "Migration paths",
          "Known upgrade paths between library versions.",
          deps.tableCounts.migrationPaths,
        ),
        item(
          deps,
          "audit-patterns",
          "Audit patterns",
          "Dependency issue detection patterns per category.",
          deps.tableCounts.auditPatterns,
        ),
        item(
          deps,
          "fix-targets",
          "Fix targets",
          "Remediation link targets for audit findings.",
          deps.tableCounts.fixTargets,
        ),
      ],
    },
    {
      id: "search",
      title: "Search providers",
      description: "Live providers used for topic search and fallback retrieval.",
      items: [
        item(deps, "search-mdn", "MDN Web Docs", "Web standards reference search.", 1),
        item(deps, "search-ddg", "DuckDuckGo", "Instant answers and HTML results.", 1),
        item(deps, "search-searxng", "SearXNG", "Community instances behind a circuit breaker.", 4),
        item(deps, "search-mojeek", "Mojeek", "Independent index with direct URLs.", 1),
      ],
    },
  ];

  const totalEntries = groups
    .flatMap((group) => group.items)
    .reduce((total, source) => total + source.entries, 0);

  const { blocked, wildcards } = deps.getSourceSettings();
  return { groups, totalEntries, registryEntries: deps.tableCounts.libraryRegistry, blocked, wildcards };
}

export async function updateSourcesSettings(
  deps: SourcesDeps,
  input: {
    disabled?: unknown;
    blocked?: unknown;
    wildcards?: unknown;
  },
): Promise<SourcesSnapshot> {
  await deps.updateSourceSettings(input);
  return getSourcesSnapshot(deps);
}
