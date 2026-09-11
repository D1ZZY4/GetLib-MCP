import type { CacheEntry } from "../types";
import { CACHE_TTL_MS, SWR_STALE_TTL_MS } from "../constants";

export class LRUCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly maxBytes: number;
  private readonly sizeOf: (value: T) => number;
  private bytes = 0;

  /**
   * @param maxSize entry-count bound (LRU eviction).
   * @param maxBytes approximate byte bound enforced alongside maxSize.
   *   Entries are measured with sizeOf (string length by default, flat
   *   estimate otherwise). Oversized single entries still store - the cap
   *   bounds the aggregate, not individual values.
   */
  constructor(
    maxSize = 200,
    maxBytes = Number.POSITIVE_INFINITY,
    sizeOf: (value: T) => number = (value) =>
      typeof value === "string" ? (value as string).length : 1024,
  ) {
    this.maxSize = maxSize;
    this.maxBytes = maxBytes;
    this.sizeOf = sizeOf;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    const now = Date.now();
    if (now > entry.expiresAt) {
      // Serve-stale within the SWR window to smooth over brief upstream hiccups;
      // drop entirely once the stale window has also elapsed.
      if (now <= entry.expiresAt + SWR_STALE_TTL_MS) {
        this.store.delete(key);
        this.store.set(key, entry);
        return entry.data;
      }
      this.store.delete(key);
      this.bytes -= this.sizeOf(entry.data);
      return undefined;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.data;
  }

  private evictOldest(): void {
    const firstKey = this.store.keys().next().value;
    if (firstKey === undefined) return;
    const removed = this.store.get(firstKey);
    this.store.delete(firstKey);
    if (removed) this.bytes -= this.sizeOf(removed.data);
  }

  set(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
    const existing = this.store.get(key);
    if (existing) {
      this.bytes -= this.sizeOf(existing.data);
      this.store.delete(key);
    }
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
    this.bytes += this.sizeOf(data);
    while (this.store.size > this.maxSize || this.bytes > this.maxBytes) {
      // Evict least recently used (first entry)
      const before = this.store.size;
      this.evictOldest();
      if (this.store.size === before) break;
    }
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.store.clear();
    this.bytes = 0;
  }

  size(): number {
    return this.store.size;
  }
}
