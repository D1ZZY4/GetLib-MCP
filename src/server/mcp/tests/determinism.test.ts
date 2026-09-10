import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { pipelineBudgetMs } from "@/application/library/search.service";
import { TOOL_TIMEOUT_MS } from "@/server/mcp/constants";
import { DiskCache } from "@/server/mcp/services/disk-cache";
import { SNIPPET_INDEX_TTL_MS, SnippetStore } from "@/server/mcp/services/snippet-store";
import {
  buildIndexShared,
  clearSnippetBuildInFlight,
  snippetBuildBudgetMs,
} from "@/server/mcp/tools/snippets";
import type { SnippetIndex } from "@/server/mcp/types";

function fakeIndex(library: string): SnippetIndex {
  return {
    library,
    version: null,
    sourceUrl: "https://example.com/docs",
    snippets: [
      {
        id: "s1",
        library,
        title: "Middleware example",
        description: "Shows middleware usage",
        code: "export function middleware() { return 'ok'; }",
        language: "typescript",
        source: "https://example.com/docs",
        score: 0,
      },
    ],
    builtAt: new Date().toISOString(),
  };
}

describe("F1 - shared pipeline budget stays below the outer tool timeout", () => {
  test("search budget leaves headroom for the outer per-caller race", () => {
    const budget = pipelineBudgetMs();
    expect(budget).toBeGreaterThanOrEqual(10_000);
    expect(budget).toBeLessThan(TOOL_TIMEOUT_MS);
  });
});

describe("F2 - snippet rebuild singleflight and stability", () => {
  test("snippet budget leaves headroom for the outer per-caller race", () => {
    const budget = snippetBuildBudgetMs();
    expect(budget).toBeGreaterThanOrEqual(10_000);
    expect(budget).toBeLessThan(TOOL_TIMEOUT_MS);
  });

  test("parallel rebuilds for one key share a single execution", async () => {
    clearSnippetBuildInFlight();
    let executions = 0;
    const build = async (): Promise<SnippetIndex | null> => {
      executions += 1;
      await new Promise((r) => setTimeout(r, 20));
      return fakeIndex("test-lib");
    };
    const results = await Promise.all(
      Array.from({ length: 5 }, () => buildIndexShared("f2-share-key", build, 5_000)),
    );
    expect(executions).toBe(1);
    for (const result of results) {
      expect(result?.snippets.length).toBe(1);
    }
    clearSnippetBuildInFlight();
  });

  test("a hung rebuild resolves to the persisted fallback instead of hanging", async () => {
    clearSnippetBuildInFlight();
    const hung = (): Promise<SnippetIndex | null> => new Promise(() => {});
    const result = await buildIndexShared("f2-hung-key", hung, 25);
    expect(result).toBeNull();
    clearSnippetBuildInFlight();
  });

  test("snippet disk entries live for days, not hours", () => {
    expect(SNIPPET_INDEX_TTL_MS).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000);
  });

  test("memory mirror serves a saved index even when disk reads fail", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gl-snippet-mirror-"));
    try {
      const store = new SnippetStore(new DiskCache(dir));
      const index = fakeIndex("mirror-lib");
      await store.save(index);
      const disk = (store as unknown as { disk: { get: (key: string) => Promise<string | undefined> } }).disk;
      disk.get = async () => undefined;
      const loaded = await store.load("mirror-lib", null);
      expect(loaded?.snippets.length).toBe(1);
      expect(loaded?.snippets[0]?.title).toBe("Middleware example");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
