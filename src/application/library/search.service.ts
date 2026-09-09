import { normalizeQueryYear } from "@/server/mcp/utils/extract";
import { buildEvidenceBlock, checkEvidence } from "@/server/mcp/utils/evidence";
import {
  CACHE_TTLS,
  DEFAULT_TOKEN_LIMIT,
  MAX_TOKEN_LIMIT,
  sharedPipelineBudgetMs,
} from "@/server/mcp/constants";
import { collectSearchSources } from "@/server/mcp/services/search/collect";
import { addWebSearchSources } from "@/server/mcp/services/search/fetch-topic";
import { LRUCache } from "@/server/mcp/services/lru-cache";

export const SEARCH_TOKENS_MIN = 1000;
export const SEARCH_TOKENS_DEFAULT = DEFAULT_TOKEN_LIMIT;
export const SEARCH_TOKENS_MAX = MAX_TOKEN_LIMIT;
export const SEARCH_QUERY_MAX = 500;

const NO_RESULTS_HELP = [
  "**What to try next:**",
  "- Be more specific (e.g. 'React hooks best practices' instead of 'React')",
  "- Include the library name + topic (e.g. 'Next.js middleware authentication')",
  "- Try gl_resolve_library to find a specific library, then gl_get_docs",
  "- Try gl_get_docs with a direct URL as the libraryId",
].join("\n");

export interface SearchInput {
  query: string;
  tokens?: number;
}

export interface SearchApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: {
      query: string;
      sources: Array<{ name: string; url: string; content: string }>;
      evidence: { ok: boolean; matchRatio: number; occurrences: number; verdict: string };
    };
  };
  resolved: boolean;
}

/**
 * Library search use case shared by the MCP search tool, the dashboard
 * discover flow, and any future consumer. Owns the full pipeline:
 * normalize, collect, evidence-escalate, render. Transport adapters
 * (tools, API routes) only validate input and map this result.
 *
 * Determinism contract: identical (query, tokens) inputs return identical
 * results, even under parallel load. Completed results (including empty
 * no-result answers) are memoized, and concurrent identical calls share one
 * in-flight pipeline instead of each fanning out its own network storm.
 * The in-flight entry includes a single shared budget timer, so N parallel
 * callers resolve to the same outcome: either all observe the completed
 * pipeline or all observe the same deterministic empty answer. Per-caller
 * timeout races outside this use case cannot diverge the group. The shared
 * budget resolves to the same empty answer an exhausted pipeline returns,
 * so it is safe to memoize. The outer tool-adapter timeout fallback (a
 * distinct timedOut payload) stays uncached, so a catastrophic hang above
 * this layer still cannot poison later calls.
 */
const searchResultCache = new LRUCache<SearchApplicationResult>(200);
const searchInFlight = new Map<string, Promise<SearchApplicationResult>>();

function emptySearchResult(query: string): SearchApplicationResult {
  return {
    response: {
      content: [{ type: "text", text: `No results found for: "${query}"\n\n${NO_RESULTS_HELP}` }],
    },
    resolved: false,
  };
}

/**
 * Shared pipeline budget, kept comfortably below the outer tool timeout so
 * the outer per-caller race never decides the outcome first. When the
 * budget expires the group resolves to the same deterministic empty
 * answer that an exhausted pipeline returns, which is then memoized
 * like any other completed result.
 */
export function pipelineBudgetMs(): number {
  return sharedPipelineBudgetMs();
}

function runPipelineWithSharedBudget(query: string, tokens: number): Promise<SearchApplicationResult> {
  const budgetMs = pipelineBudgetMs();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget: Promise<SearchApplicationResult> = new Promise((resolve) => {
    timer = setTimeout(() => resolve(emptySearchResult(query)), budgetMs);
  });
  const pipeline = runSearchPipeline(query, tokens);
  return Promise.race([pipeline, budget]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

export async function searchLibrariesUseCase(input: SearchInput): Promise<SearchApplicationResult> {
  const tokens = input.tokens ?? SEARCH_TOKENS_DEFAULT;
  const query = normalizeQueryYear(input.query);
  const key = `search:${query}:${tokens}`;
  const cached = searchResultCache.get(key);
  if (cached) return cached;
  const ongoing = searchInFlight.get(key);
  if (ongoing) return ongoing;
  const pipeline = runPipelineWithSharedBudget(query, tokens).then((result) => {
    searchResultCache.set(key, result, CACHE_TTLS.SEARCH_RESULT);
    return result;
  }).finally(() => {
    if (searchInFlight.get(key) === pipeline) searchInFlight.delete(key);
  });
  searchInFlight.set(key, pipeline);
  return pipeline;
}

async function runSearchPipeline(query: string, tokens: number): Promise<SearchApplicationResult> {
  const { results, webSearched } = await collectSearchSources(query, tokens);

  if (results.length === 0) {
    return emptySearchResult(query);
  }

  // Evidence-driven escalation - sources exist but combined coverage is weak:
  // add authoritative web sources once instead of shipping a thin answer.
  let combinedCheck = checkEvidence(results.map((r) => r.content).join("\n\n"), query);
  if (!combinedCheck.ok && !webSearched && results.length < 3) {
    await addWebSearchSources(query, results, Math.floor(tokens / 3), 2);
    combinedCheck = checkEvidence(results.map((r) => r.content).join("\n\n"), query);
  }

  const header = [
    `# Search: ${query}`,
    `> Found ${results.length} source${results.length > 1 ? "s" : ""}`,
    "",
    "---",
    "",
  ].join("\n");
  const body = results
    .map((r) => `## ${r.source}\n> Source: ${r.url}\n\n${r.content}\n\n---\n`)
    .join("\n");
  const evidenceBlock = buildEvidenceBlock({
    sources: results.map((r) => ({ url: r.url })),
    topic: query,
    check: combinedCheck,
  });

  return {
    response: {
      content: [{ type: "text", text: header + body + evidenceBlock }],
      structuredContent: {
        query,
        sources: results.map((r) => ({ name: r.source, url: r.url, content: r.content })),
        evidence: {
          ok: combinedCheck.ok,
          matchRatio: combinedCheck.matchRatio,
          occurrences: combinedCheck.occurrences,
          verdict: combinedCheck.ok ? "strong" : combinedCheck.matchRatio > 0 ? "weak" : "miss",
        },
      },
    },
    resolved: results.length > 0,
  };
}
