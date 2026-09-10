import type { CompatDeps } from "@/application/compat/compat.service";
import {
  resolveMdnCandidates,
  fetchBcdSection,
  fetchRenderedMdn,
  fetchCaniuse,
  fetchMdnSearchPage,
} from "@/server/mcp/services/compat-sources";
import { docCache } from "@/server/mcp/services/cache";

/**
 * Live infrastructure binding for the compat use case. The tool adapter
 * injects this; tests inject stubs. No business logic lives here, only
 * wiring between the application seam and the concrete providers.
 */
export const liveCompatDeps: CompatDeps = {
  resolveMdnCandidates,
  fetchBcdSection,
  fetchRenderedMdn,
  fetchCaniuse,
  fetchMdnSearchPage,
  cacheGet: (key) => docCache.get(key),
  cacheSet: (key, value) => {
    docCache.set(key, value);
  },
};
