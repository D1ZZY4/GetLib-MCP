import type { Snippet, SnippetIndex } from "../types";
import { DiskCache } from "./cache";
import { rankSnippets } from "../utils/snippet-extract";

/**
 * Snippet indexes are expensive to rebuild (multi-page docs traversal) and
 * must survive transient upstream failures. The disk entry lives for days,
 * not hours, and an in-memory mirror serves repeat calls within the same
 * process even when disk I/O flakes. A flaky rebuild must never flip a
 * known-good library to "No snippets indexed".
 */
export const SNIPPET_INDEX_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MEMORY_MIRROR_MAX = 200;

function indexKey(library: string, version: string | null): string {
  return `snippets:${library}:${version ?? "latest"}`;
}

export class SnippetStore {
  private readonly disk: DiskCache;
  private readonly memory = new Map<string, { index: SnippetIndex; expiresAt: number }>();

  constructor(disk = new DiskCache()) {
    this.disk = disk;
  }

  private remember(key: string, index: SnippetIndex): void {
    if (this.memory.size >= MEMORY_MIRROR_MAX) {
      const oldest = this.memory.keys().next().value;
      if (oldest !== undefined) this.memory.delete(oldest);
    }
    this.memory.set(key, { index, expiresAt: Date.now() + SNIPPET_INDEX_TTL_MS });
  }

  private recall(key: string): SnippetIndex | null {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    this.memory.delete(key);
    this.memory.set(key, entry);
    return entry.index;
  }

  async save(index: SnippetIndex): Promise<void> {
    const key = indexKey(index.library, index.version);
    this.remember(key, index);
    await this.disk.set(key, JSON.stringify(index), SNIPPET_INDEX_TTL_MS);
  }

  async load(library: string, version: string | null): Promise<SnippetIndex | null> {
    const key = indexKey(library, version);
    const mem = this.recall(key);
    if (mem) return mem;
    const raw = await this.disk.get(key);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      // An old-schema or truncated cache file can parse to a non-conforming
      // object; reject it as a cache-miss so query()/rankSnippets never receive
      // a missing snippets array (mirrors the TS-004 guard in cache.ts).
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        typeof (parsed as Record<string, unknown>)["library"] !== "string" ||
        typeof (parsed as Record<string, unknown>)["sourceUrl"] !== "string" ||
        typeof (parsed as Record<string, unknown>)["builtAt"] !== "string" ||
        !Array.isArray((parsed as Record<string, unknown>)["snippets"])
      ) {
        return null;
      }
      const index = parsed as SnippetIndex;
      this.remember(key, index);
      return index;
    } catch {
      return null;
    }
  }

  async has(library: string, version: string | null): Promise<boolean> {
    if (this.recall(indexKey(library, version))) return true;
    return this.disk.has(indexKey(library, version));
  }

  /** Test seam - clears the in-memory mirror. Disk entries are TTL-bound. */
  clearMemory(): void {
    this.memory.clear();
  }

  async query(
    library: string,
    version: string | null,
    topic: string,
    language?: string,
    max = 10,
  ): Promise<{ snippets: Snippet[]; sourceUrl: string; builtAt: string } | null> {
    const index = await this.load(library, version);
    if (!index) return null;
    const ranked = rankSnippets(index.snippets, topic, language, max);
    return { snippets: ranked, sourceUrl: index.sourceUrl, builtAt: index.builtAt };
  }
}

export const snippetStore = new SnippetStore();
