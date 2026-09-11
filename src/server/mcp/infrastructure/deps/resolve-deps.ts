import type { ResolveDeps } from "@/application/library/resolve.service";
import { fuzzySearch, lookupByAlias } from "@/server/mcp/sources/registry";
import { resolveBareNameCandidates } from "@/server/mcp/services/resolve";
import { resolvePrefixedCandidate } from "@/server/mcp/services/resolve/registries";
import { isLibraryBlocked, isSourceEnabled } from "@/server/mcp/services/source-settings";

/**
 * Live infrastructure binding for the resolve use case. Tool and route
 * adapters inject this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveResolveDeps: ResolveDeps = {
  lookupByAlias,
  fuzzySearch,
  resolveBareNameCandidates,
  resolvePrefixedCandidate,
  isSourceEnabled,
  isLibraryBlocked,
};
