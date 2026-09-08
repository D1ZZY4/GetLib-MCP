import { AUDIT_PATTERNS } from "@/server/mcp/sources/audit-patterns";
import { FIX_TARGET_GROUPS } from "@/server/mcp/sources/audit-fix-urls";
import { BEST_PRACTICES_URLS } from "@/server/mcp/sources/best-practice-urls";
import { DEFAULT_URL_PATTERNS } from "@/server/mcp/sources/doc-url-patterns";
import { MIGRATION_PATHS } from "@/server/mcp/sources/migration-paths";
import { LIBRARY_REGISTRY } from "@/server/mcp/sources/registry";
import { TOPIC_URL_MAP } from "@/server/mcp/sources/topic-urls";
import {
  getSourceSettings,
  isSourceEnabled,
  updateSourceSettings,
} from "@/server/mcp/services/source-settings";

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

function item(
  id: string,
  name: string,
  description: string,
  entries: number,
): SourceSummaryItem {
  return { id, name, description, entries, enabled: isSourceEnabled(id) };
}

/**
 * Documentation sources actually wired into this MCP server process.
 * Counts are read live from the source tables, so the Sources settings
 * page always reflects the running server instead of static mock data.
 */
export function getSourcesSnapshot(): SourcesSnapshot {
  const groups: SourceSummaryGroup[] = [
    {
      id: "library",
      title: "Library registry",
      description: "Curated library entries backing resolve, docs, and snippets.",
      items: [
        item(
          "library-registry",
          "Library registry",
          "Curated libraries with docs URLs, aliases, and package mappings.",
          LIBRARY_REGISTRY.length,
        ),
      ],
    },
    {
      id: "documentation",
      title: "Documentation sources",
      description: "URL tables used to locate official docs and best practices.",
      items: [
        item(
          "doc-url-patterns",
          "Doc URL patterns",
          "Per-library documentation URL patterns for direct fetching.",
          DEFAULT_URL_PATTERNS.length,
        ),
        item(
          "best-practice-urls",
          "Best-practice URLs",
          "Curated best-practice guides per library and topic.",
          Object.keys(BEST_PRACTICES_URLS).length,
        ),
        item(
          "topic-urls",
          "Topic URLs",
          "Authoritative URLs for cross-cutting topics and standards.",
          TOPIC_URL_MAP.length,
        ),
      ],
    },
    {
      id: "guidance",
      title: "Guidance sources",
      description: "Migration, audit, and remediation knowledge tables.",
      items: [
        item(
          "migration-paths",
          "Migration paths",
          "Known upgrade paths between library versions.",
          MIGRATION_PATHS.length,
        ),
        item(
          "audit-patterns",
          "Audit patterns",
          "Dependency issue detection patterns per category.",
          AUDIT_PATTERNS.length,
        ),
        item(
          "fix-targets",
          "Fix targets",
          "Remediation link targets for audit findings.",
          FIX_TARGET_GROUPS.length,
        ),
      ],
    },
    {
      id: "search",
      title: "Search providers",
      description: "Live providers used for topic search and fallback retrieval.",
      items: [
        item("search-mdn", "MDN Web Docs", "Web standards reference search.", 1),
        item("search-ddg", "DuckDuckGo", "Instant answers and HTML results.", 1),
        item("search-searxng", "SearXNG", "Community instances behind a circuit breaker.", 4),
        item("search-mojeek", "Mojeek", "Independent index with direct URLs.", 1),
      ],
    },
  ];

  const totalEntries = groups
    .flatMap((group) => group.items)
    .reduce((total, source) => total + source.entries, 0);

  const { blocked, wildcards } = getSourceSettings();
  return { groups, totalEntries, registryEntries: LIBRARY_REGISTRY.length, blocked, wildcards };
}

export async function updateSourcesSettings(input: {
  disabled?: unknown;
  blocked?: unknown;
  wildcards?: unknown;
}): Promise<SourcesSnapshot> {
  await updateSourceSettings(input);
  return getSourcesSnapshot();
}
