import type { SearchDeps } from "@/application/library/search.service";
import { collectSearchSources } from "@/server/mcp/services/search/collect";
import { addWebSearchSources } from "@/server/mcp/services/search/fetch-topic";

/**
 * Live infrastructure binding for the search use case. Tool and route
 * adapters inject this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveSearchDeps: SearchDeps = {
  collectSearchSources,
  addWebSearchSources,
};
