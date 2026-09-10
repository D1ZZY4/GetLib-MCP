import type { SourcesDeps } from "@/application/sources/sources.service";
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

/**
 * Live infrastructure binding for the sources snapshot. Route adapters
 * inject this; tests inject stubs. No business logic lives here, only
 * wiring between the application seam and the concrete providers.
 */
export const liveSourcesDeps: SourcesDeps = {
  tableCounts: {
    get libraryRegistry() {
      return LIBRARY_REGISTRY.length;
    },
    get docUrlPatterns() {
      return DEFAULT_URL_PATTERNS.length;
    },
    get bestPracticeUrls() {
      return Object.keys(BEST_PRACTICES_URLS).length;
    },
    get topicUrls() {
      return TOPIC_URL_MAP.length;
    },
    get migrationPaths() {
      return MIGRATION_PATHS.length;
    },
    get auditPatterns() {
      return AUDIT_PATTERNS.length;
    },
    get fixTargets() {
      return FIX_TARGET_GROUPS.length;
    },
  },
  isSourceEnabled,
  getSourceSettings,
  updateSourceSettings,
};
