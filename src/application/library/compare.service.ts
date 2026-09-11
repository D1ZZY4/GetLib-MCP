import { createHash } from "crypto";
import { isExtractionAttempt, withNotice } from "@/server/mcp/utils/guard";
import { log } from "@/server/mcp/utils/logger";
import { extractRelevantContent } from "@/server/mcp/utils/extract";
import { sanitizeContent } from "@/server/mcp/utils/sanitize";
import type { LibraryEntry } from "@/server/mcp/types";

export interface CompareFetchResult {
  content: string;
  url: string | null;
  sourceType: string;
}

export const COMPARE_TOKENS_DEFAULT = 2000;

/**
 * Capability seams of the compare use case. Registry lookup, docs
 * retrieval, and the cache are infrastructure injected here. Pure
 * content transformation (sanitize, extract) and shared
 * protection/presentation (guard) stay imported as cross-cutting
 * technical infrastructure.
 */
export interface CompareDeps {
  lookupById: (id: string) => LibraryEntry | null | undefined;
  lookupByAlias: (alias: string) => LibraryEntry | null | undefined;
  fuzzySearch: (name: string, limit: number) => LibraryEntry[];
  fetchDocs: (
    docsUrl: string,
    llmsTxtUrl: string | undefined,
    llmsFullTxtUrl: string | undefined,
    topic: string,
  ) => Promise<CompareFetchResult | null>;
  fetchFirstIndexDeepLink: (
    content: string,
    topic: string,
    baseUrl: string,
  ) => Promise<{ content: string; url: string } | null>;
  cacheGet: (key: string) => string | undefined;
  cacheSet: (key: string, value: string) => void;
}

export interface CompareInput {
  libraries: string[];
  criteria?: string;
  tokens: number;
}

export interface CompareApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  };
  resolved: boolean;
}

/**
 * Library comparison use case shared by the MCP tool and any future
 * consumer. Owns the full pipeline: per-item extraction guard, registry
 * resolution, cached parallel fetching with index deep-linking, render.
 * Transport adapters only validate input, inject the live
 * infrastructure adapters, and map this result.
 */
export async function compareUseCase(input: CompareInput, deps: CompareDeps): Promise<CompareApplicationResult> {
  const { criteria, tokens } = input;
  // Dedupe identical names (case-insensitive) so ["prisma","prisma"]
  // compares once instead of fetching twice.
  const libraries = [...new Map(input.libraries.map((lib) => [lib.toLowerCase(), lib])).values()];
  // No extraction guard on `criteria` - it is a comparison angle, not a
  // registry key ("full feature list" is a legitimate criteria).
  const topic = criteria ? `${criteria} comparison tradeoffs` : "overview features comparison";
  // Per-item guard: one flagged name is treated as unresolvable instead of
  // aborting the sibling libraries' comparison.
  const entries = libraries.map((lib) => ({
    lib,
    entry: isExtractionAttempt(lib)
      ? null
      : (deps.lookupById(lib) ?? deps.lookupByAlias(lib) ?? deps.fuzzySearch(lib, 1)[0] ?? null),
  }));

  if (entries.every(({ entry }) => entry === null)) {
    const text = withNotice(
      `Could not resolve any of the requested libraries.\n\nTry using exact package names or registry IDs from \`gl_resolve_library\`.`,
    );
    return { response: { content: [{ type: "text", text }] }, resolved: false };
  }

  const fetchResults = await Promise.allSettled(
    entries.map(async ({ lib, entry }) => {
      const topicHash = createHash("sha256").update(topic).digest("hex").slice(0, 16);
      // Tokens shape the extracted content, so the key must include
      // them - otherwise the same topic with different budgets collides.
      const cacheKey = `compare:${entry?.id ?? lib}:${topicHash}:${tokens ?? COMPARE_TOKENS_DEFAULT}`;
      const cached = deps.cacheGet(cacheKey);
      if (typeof cached === "string") return { lib, entry, content: cached };

      if (!entry) return { lib, entry: null, content: null };

      try {
        let fetchResult = await deps.fetchDocs(entry.docsUrl, entry.llmsTxtUrl, entry.llmsFullTxtUrl, topic);
        if (!fetchResult) return { lib, entry, content: null };
        const deep = await deps.fetchFirstIndexDeepLink(
          fetchResult.content,
          topic,
          fetchResult.url || entry.docsUrl,
        );
        if (deep) fetchResult = { content: deep.content, url: deep.url, sourceType: "jina" };
        const safe = sanitizeContent(fetchResult.content);
        const { text } = extractRelevantContent(safe, topic, tokens ?? COMPARE_TOKENS_DEFAULT);
        deps.cacheSet(cacheKey, text);
        return { lib, entry, content: text };
      } catch (error) {
        log({ level: "debug", msg: "compare.fetch.failed", lib, error: error instanceof Error ? error.message : String(error) });
        return { lib, entry, content: null };
      }
    }),
  );

  const sections: string[] = [];
  const structuredLibraries: Array<{
    id: string;
    name: string;
    description: string;
    docsUrl: string;
    content: string;
  }> = [];

  for (const result of fetchResults) {
    if (result.status !== "fulfilled") continue;
    const { lib, entry, content } = result.value;
    const name = entry?.name ?? lib;
    const id = entry?.id ?? lib;
    const description = entry?.description ?? "";
    const docsUrl = entry?.docsUrl ?? "";
    const displayContent = content ?? `_No documentation found for ${name}._`;

    sections.push(`## ${name}\n\n${description ? `> ${description}\n\n` : ""}${displayContent}`);
    structuredLibraries.push({ id, name, description, docsUrl, content: displayContent });
  }

  if (sections.length === 0) {
    const text = withNotice(
      `Could not resolve any of the requested libraries.\n\nTry using exact package names or registry IDs from \`gl_resolve_library\`.`,
    );
    return { response: { content: [{ type: "text", text }] }, resolved: false };
  }

  const header = [
    `# Comparison: ${libraries.join(" vs ")}`,
    criteria ? `Criteria: **${criteria}**` : "",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = withNotice(`${header}\n\n${sections.join("\n\n---\n\n")}`);

  return {
    response: {
      content: [{ type: "text", text: response }],
      structuredContent: {
        libraries: structuredLibraries,
        criteria: criteria ?? "general overview",
      },
    },
    resolved: true,
  };
}
