import type { DocsDeps } from "@/application/library/docs.service";
import { isIndexContent } from "@/server/mcp/services/fetcher";
import { deepFetchForTopic } from "@/server/mcp/services/deep-fetch";
import { detectVersionForEntry } from "@/server/mcp/utils/lockfile";
import { resolveDocsTarget, resolveLibraryFromId } from "@/server/mcp/services/docs/docs-resolve";
import { applyTopic, fetchDocsContent } from "@/server/mcp/services/docs/docs-fetch";
import { renderDocs } from "@/server/mcp/services/docs/docs-report";

/**
 * Live infrastructure binding for the docs use case. Tool and route
 * adapters inject this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveDocsDeps: DocsDeps = {
  resolveLibraryFromId,
  detectVersionForEntry,
  resolveDocsTarget,
  fetchDocsContent,
  applyTopic,
  deepFetchForTopic,
  renderDocs,
  isIndexContent,
};
