import { fuzzySearch, lookupByAlias } from "@/server/mcp/sources/registry";
import type { LibraryMatch } from "@/server/mcp/types";
import { isExtractionAttempt, withNotice, EXTRACTION_REFUSAL } from "@/server/mcp/utils/guard";
import { isLibraryBlocked, isSourceEnabled } from "@/server/mcp/services/source-settings";
import {
  resolveFromNpm,
  resolveFromPypi,
  resolveFromCrates,
  resolveFromGo,
  searchNpm,
  searchGitHub,
} from "@/server/mcp/services/resolve";

export const RESOLVE_NAME_MAX = 200;
export const RESOLVE_QUERY_MAX = 500;

/** Render resolver matches, or an actionable message when nothing matched. */
function formatResults(matches: LibraryMatch[]): string {
  if (matches.length === 0) {
    return [
      "No libraries found matching that name.",
      "",
      "**What to try next:**",
      "- Check spelling and try common aliases (e.g. 'nextjs' instead of 'next.js')",
      "- Use gl_search for a freeform query (works for any topic, not just libraries)",
      "- Provide a direct docs URL to gl_get_docs (e.g. 'https://docs.example.com')",
      "- Try the npm/PyPI package name if this is a less-known library",
    ].join("\n");
  }

  const lines: string[] = [
    `Found ${matches.length} result${matches.length > 1 ? "s" : ""}.`,
    "",
    "Use the ID from one of these results with gl_get_docs.",
    "",
  ];

  for (const m of matches) {
    lines.push(`### ${m.name}`);
    lines.push(`- **ID**: \`${m.id}\``);
    if (m.description) lines.push(`- **Description**: ${m.description}`);
    lines.push(`- **Docs**: ${m.docsUrl}`);
    if (m.llmsFullTxtUrl) lines.push(`- **LLMs-full.txt**: ${m.llmsFullTxtUrl}`);
    if (m.llmsTxtUrl) lines.push(`- **LLMs.txt**: ${m.llmsTxtUrl}`);
    if (m.githubUrl) lines.push(`- **GitHub**: ${m.githubUrl}`);
    lines.push(`- **Source**: ${m.source}`);
    lines.push("");
  }

  return lines.join("\n");
}

export interface ResolveInput {
  libraryName: string;
  query?: string;
}

export interface ResolveApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: { matches: LibraryMatch[] };
  };
  resolved: boolean;
}

/**
 * Library resolution use case shared by the MCP resolve tool, batch
 * resolution, and any future consumer. Owns the full pipeline: extraction
 * guard, exact alias, fuzzy search, external package fallbacks, query
 * re-ranking, blocked-list filtering, render. Transport adapters (tools,
 * API routes) only validate input and map this result.
 */
export async function resolveLibraryUseCase(input: ResolveInput): Promise<ResolveApplicationResult> {
  const name = input.libraryName.trim();
  const query = input.query;

  if (isExtractionAttempt(name) || (query !== undefined && isExtractionAttempt(query))) {
    return {
      response: { content: [{ type: "text", text: EXTRACTION_REFUSAL }] },
      resolved: true,
    };
  }

  const matches: LibraryMatch[] = [];

  // Registry steps are skipped when library-registry is disabled on
  // the Sources page - external package fallbacks below still run.
  const registryOn = isSourceEnabled("library-registry");

  // 1. Exact alias lookup in registry
  const exact = registryOn ? lookupByAlias(name) : undefined;
  if (exact) {
    matches.push({
      id: exact.id,
      name: exact.name,
      description: exact.description,
      docsUrl: exact.docsUrl,
      llmsTxtUrl: exact.llmsTxtUrl,
      ...(exact.llmsFullTxtUrl !== undefined && { llmsFullTxtUrl: exact.llmsFullTxtUrl }),
      githubUrl: exact.githubUrl,
      score: 100,
      source: "registry",
    });
  }

  // 2. Fuzzy search registry
  if (registryOn && matches.length === 0) {
    const fuzzy = fuzzySearch(name, 5);
    for (const entry of fuzzy) {
      if (!matches.some((m) => m.id === entry.id)) {
        matches.push({
          id: entry.id,
          name: entry.name,
          description: entry.description,
          docsUrl: entry.docsUrl,
          llmsTxtUrl: entry.llmsTxtUrl,
          ...(entry.llmsFullTxtUrl !== undefined && { llmsFullTxtUrl: entry.llmsFullTxtUrl }),
          githubUrl: entry.githubUrl,
          score: 80,
          source: "registry",
        });
      }
    }
  }

  // 3. Fallback to package registries (npm, PyPI, crates.io, Go) - only when
  // the registry gave nothing, or very few low-quality fuzzy hits. Multiple
  // decent fuzzy results suppress the external round-trips (a well-aliased
  // entry should not trigger npm/pypi lookups just for scoring < 90).
  if (matches.length === 0 || (matches.length < 3 && matches.every((m) => m.source === "registry" && m.score < 85))) {
    const [npmResult, pypiResult] = await Promise.all([
      resolveFromNpm(name),
      resolveFromPypi(name),
    ]);
    if (npmResult && !matches.some((m) => m.id === npmResult.id)) matches.push(npmResult);
    if (pypiResult && !matches.some((m) => m.id === pypiResult.id)) matches.push(pypiResult);

    if (matches.length === 0) {
      const [cratesResult, goResult] = await Promise.all([
        resolveFromCrates(name),
        resolveFromGo(name),
      ]);
      if (cratesResult && !matches.some((m) => m.id === cratesResult.id)) matches.push(cratesResult);
      if (goResult && !matches.some((m) => m.id === goResult.id)) matches.push(goResult);
    }

    if (matches.length === 0) {
      const [npmSearchResult, githubResult] = await Promise.all([
        searchNpm(name),
        searchGitHub(name),
      ]);
      if (npmSearchResult) matches.push(npmSearchResult);
      if (githubResult && !matches.some((m) => m.id === githubResult.id)) matches.push(githubResult);
    }
  }

  // Boost score if query tokens match description/tags
  if (query && query.trim()) {
    // Token-level match: a multi-word query ("async runtime") should boost a
    // description that contains the words separately, not only as an exact
    // substring. .some() avoids under-boosting when the query has stop words.
    const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    for (const m of matches) {
      const desc = m.description.toLowerCase();
      if (tokens.some((t) => desc.includes(t))) m.score += 5;
    }
    matches.sort((a, b) => b.score - a.score);
  }

  // Blocked on the Sources page: drop registry matches (wildcards exempt).
  // External package fallbacks above are live data, not the curated
  // registry, so only registry-sourced matches are filtered.
  const visible = matches.filter(
    (m) => m.source !== "registry" || !isLibraryBlocked(m.id, [m.name]),
  );

  const text = withNotice(formatResults(visible.slice(0, 5)));

  return {
    response: {
      content: [{ type: "text", text }],
      structuredContent: { matches: visible.slice(0, 5) },
    },
    resolved: visible.length > 0,
  };
}
