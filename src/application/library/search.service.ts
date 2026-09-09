import { normalizeQueryYear } from "@/server/mcp/utils/extract";
import { buildEvidenceBlock, checkEvidence } from "@/server/mcp/utils/evidence";
import { DEFAULT_TOKEN_LIMIT, MAX_TOKEN_LIMIT } from "@/server/mcp/constants";
import { collectSearchSources } from "@/server/mcp/services/search/collect";
import { addWebSearchSources } from "@/server/mcp/services/search/fetch-topic";

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
 */
export async function searchLibrariesUseCase(input: SearchInput): Promise<SearchApplicationResult> {
  const tokens = input.tokens ?? SEARCH_TOKENS_DEFAULT;
  const query = normalizeQueryYear(input.query);
  const { results, webSearched } = await collectSearchSources(query, tokens);

  if (results.length === 0) {
    return {
      response: {
        content: [{ type: "text", text: `No results found for: "${query}"\n\n${NO_RESULTS_HELP}` }],
      },
      resolved: false,
    };
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
