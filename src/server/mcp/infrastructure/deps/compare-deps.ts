import type { CompareDeps } from "@/application/library/compare.service";
import { lookupByAlias, lookupById, fuzzySearch } from "@/server/mcp/sources/registry";
import { fetchDocs } from "@/server/mcp/services/fetcher";
import { fetchFirstIndexDeepLink } from "@/server/mcp/services/deep-fetch";
import { docCache } from "@/server/mcp/services/cache";

/**
 * Live infrastructure binding for the compare use case. The tool adapter
 * injects this; tests inject stubs. No business logic lives here, only
 * wiring between the application seam and the concrete providers.
 */
export const liveCompareDeps: CompareDeps = {
  lookupById,
  lookupByAlias,
  fuzzySearch,
  fetchDocs,
  fetchFirstIndexDeepLink,
  cacheGet: (key) => docCache.get(key),
  cacheSet: (key, value) => {
    docCache.set(key, value);
  },
};
