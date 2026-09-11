import type { LibraryMatch } from "../types";
import { LRUCache } from "./lru-cache";
import { DiskCache } from "./disk-cache";

// Shared cache instances. docCache holds full fetched documents (up to the
// 5MB response cap each), so it carries an aggregate byte bound alongside
// the count bound - count-only eviction could otherwise retain ~1GB of
// large responses. The resolve/probe caches hold small records where the
// count bound alone keeps memory trivial.
const DOC_CACHE_MAX_BYTES = 32 * 1024 * 1024;
export const docCache = new LRUCache<string>(200, DOC_CACHE_MAX_BYTES);
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

/**
 * Drops all in-memory content caches (documents, resolve results, llms
 * probes). Called on development reset so rotated sources or poisoned
 * content do not survive until TTL after mock data was wiped.
 */
export function clearDocCaches(): void {
  docCache.clear();
  resolveCache.clear();
  llmsProbeCache.clear();
}
