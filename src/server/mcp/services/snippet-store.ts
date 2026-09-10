import { z } from "zod";
import type { Snippet, SnippetIndex } from "../types";
import { DiskCache } from "./disk-cache";
import { rankSnippets } from "../utils/snippet-extract";
import { parseExternal, safeJsonParse } from "../utils/validate-external";

const snippetSchema = z.object({
  id: z.string().max(500),
  library: z.string().max(214),
  version: z.string().max(100).optional(),
  title: z.string().max(500),
  description: z.string().max(5000),
  code: z.string().max(200000),
  language: z.string().max(100),
  source: z.string().max(2000),
  score: z.number(),
});

const snippetIndexSchema = z.object({
  library: z.string().max(214),
  version: z.string().max(100).nullable(),
  sourceUrl: z.string().max(2000),
  builtAt: z.string().max(100),
  snippets: z.array(snippetSchema).max(1000),
});

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
    // An old-schema or truncated cache file parses but fails the schema;
    // reject it as a cache-miss so query()/rankSnippets never receive a
    // malformed index (same fail-closed policy as the prior manual guard).
    const index = parseExternal(snippetIndexSchema, safeJsonParse(raw));
    if (!index) return null;
    this.remember(key, index);
    return index;
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
