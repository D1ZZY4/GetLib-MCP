import type { LibraryMatch } from "../types";
import { LRUCache } from "./lru-cache";
import { DiskCache } from "./disk-cache";

// Shared cache instances
export const docCache = new LRUCache<string>(200);
export const resolveCache = new LRUCache<LibraryMatch>(500);
export const llmsProbeCache = new LRUCache<{ llmsTxtUrl?: string; llmsFullTxtUrl?: string }>(500);

// Persistent disk cache - survives across npx invocations
export const diskDocCache = new DiskCache();

/**
 * Shared memory-cache binding for use-case Deps seams. The three
 * content use cases (changelog, compare, compat) previously repeated
 * these two lambdas byte-identically; one factory keeps them from
 * drifting. TTL variants (examples) keep their own binding.
 */
export function docCacheBinding(): {
  cacheGet: (key: string) => string | undefined;
  cacheSet: (key: string, value: string) => void;
} {
  return {
    cacheGet: (key) => docCache.get(key),
    cacheSet: (key, value) => {
      docCache.set(key, value);
    },
  };
}
