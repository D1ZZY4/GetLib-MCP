import type { ExamplesDeps } from "@/application/library/examples.service";
import { config } from "@/server/mcp/config";
import { fetchWithTimeout, githubAuthHeaders } from "@/server/mcp/services/fetcher";
import { readBodyCapped } from "@/server/mcp/services/http/request";
import { diskDocCache, docCache } from "@/server/mcp/services/cache";
import { lookupByAlias, lookupById } from "@/server/mcp/sources/registry";
import { buildIndex } from "@/server/mcp/services/snippets/build-index";

/**
 * Live infrastructure binding for the examples use case. The tool
 * adapter injects this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveExamplesDeps: ExamplesDeps = {
  githubToken: config.githubToken,
  fetchWithTimeout,
  githubAuthHeaders,
  readBodyCapped,
  cacheGet: (key) => docCache.get(key),
  cacheSet: (key, value, ttlMs) => {
    docCache.set(key, value, ttlMs);
  },
  diskCacheGet: (key) => diskDocCache.get(key),
  diskCacheSet: (key, value, ttlMs) => {
    void diskDocCache.set(key, value, ttlMs);
  },
  fallback: {
    lookupById,
    lookupByAlias,
    buildIndex,
  },
};
