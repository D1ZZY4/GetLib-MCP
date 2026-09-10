import type { BatchResolveDeps } from "@/application/library/batch-resolve.service";
import { fuzzySearch, lookupByAlias } from "@/server/mcp/sources/registry";
import { isLibraryBlocked, isSourceEnabled } from "@/server/mcp/services/source-settings";

/**
 * Live infrastructure binding for the batch-resolve use case. The tool
 * adapter injects this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveBatchResolveDeps: BatchResolveDeps = {
  isSourceEnabled,
  lookupByAlias,
  fuzzySearch,
  isLibraryBlocked,
};
