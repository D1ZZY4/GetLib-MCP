import { z } from "zod";
import { isExtractionAttempt, EXTRACTION_REFUSAL } from "@/server/mcp/utils/guard";
import { parseExternal, externalSchemas } from "@/server/mcp/utils/validate-external";
import { docsFallbackResponse, type ExamplesFallbackDeps } from "./examples-fallback";
import { renderCodeSearch, type CodeSearchItem } from "./examples-render";

const codeSearchItemSchema = z.object({
  name: z.string().max(500),
  path: z.string().max(1000),
  html_url: z.string().max(2000),
  repository: z.object({
    full_name: z.string().max(300),
    description: z.string().max(5000).optional().nullable(),
    stargazers_count: z.number().optional(),
    html_url: z.string().max(2000),
  }),
});

/**
 * Capability seams of the examples use case. GitHub code search, the
 * caches, the token presence, and the docs-fallback retrieval seams are
 * infrastructure injected here. Result rendering is an
 * application-owned sibling imported directly; shared protection and
 * external-payload validation stay imported as cross-cutting technical
 * infrastructure.
 */
export interface ExamplesDeps {
  githubToken: string | undefined;
  fetchWithTimeout: (url: string, ms: number, headers: Record<string, string>) => Promise<Response>;
  githubAuthHeaders: () => Record<string, string>;
  readBodyCapped: (res: Response, max: number) => Promise<string | null>;
  cacheGet: (key: string) => string | undefined;
  cacheSet: (key: string, value: string, ttlMs: number) => void;
  diskCacheGet: (key: string) => Promise<string | undefined>;
  diskCacheSet: (key: string, value: string, ttlMs: number) => void;
  fallback: ExamplesFallbackDeps;
}

export interface ExamplesInput {
  library: string;
  pattern?: string;
  language?: string;
  maxResults: number;
}

export interface ExamplesApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  };
  resolved: boolean;
}

function buildQuery(library: string, pattern: string | undefined, language: string | undefined): string {
  const parts = [pattern ? `${library} ${pattern}` : `import ${library}`];
  if (language) parts.push(`language:${language}`);
  parts.push("-path:test -path:__test__ -path:spec -path:node_modules -path:.next");
  // Exclude documentation/markdown files - gl_examples is for real code, not
  // READMEs/API.md (which GitHub code search otherwise returns as top hits).
  parts.push("-extension:md -extension:mdx -extension:markdown -extension:rst -extension:txt");
  return parts.join(" ");
}

/**
 * Code-examples use case shared by the MCP tool and any future consumer.
 * Owns the full pipeline: extraction guard, cache tiers, authenticated
 * GitHub code search with validated envelope and per-item schema,
 * docs-derived fallback, render. Transport adapters only validate input,
 * inject the live infrastructure adapters, and map this result.
 */
export async function examplesUseCase(input: ExamplesInput, deps: ExamplesDeps): Promise<ExamplesApplicationResult> {
  const { library, pattern, language, maxResults } = input;
  if (isExtractionAttempt(library)) {
    return { response: { content: [{ type: "text", text: EXTRACTION_REFUSAL }] }, resolved: true };
  }

  const query = buildQuery(library, pattern, language);
  // Key-only normalization: the GitHub query keeps its original casing
  // (sent verbatim upstream) while "React" and "react " share one entry -
  // code search itself is case-insensitive.
  const cacheKey = `gh-code-examples:${query.trim().toLowerCase()}:${maxResults}`;

  const memCached = deps.cacheGet(cacheKey);
  if (typeof memCached === "string") {
    return { response: { content: [{ type: "text", text: memCached }] }, resolved: true };
  }
  const diskCached = await deps.diskCacheGet(cacheKey);
  if (diskCached) {
    deps.cacheSet(cacheKey, diskCached, 60 * 60 * 1000);
    return { response: { content: [{ type: "text", text: diskCached }] }, resolved: true };
  }

  const fallbackAsync = (
    reason: string,
    emptyText?: string,
  ): Promise<ExamplesApplicationResult> =>
    docsFallbackResponse(
      {
        library,
        pattern,
        language,
        maxResults,
        reason,
        ...(emptyText !== undefined ? { emptyText } : {}),
      },
      deps.fallback,
    ).then((response) => ({ response, resolved: true }));

  // GitHub code search is authenticated-only: without a token the call
  // is a guaranteed 401/403. Skip straight to the docs-derived path
  // instead of spending a round trip to be told so.
  if (!deps.githubToken) {
    return fallbackAsync("GitHub code search needs GETLIB_GITHUB_TOKEN - showing documentation-derived examples instead.");
  }

  try {
    const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=${maxResults}&sort=indexed`;
    const res = await deps.fetchWithTimeout(searchUrl, 15_000, {
      ...deps.githubAuthHeaders(),
      Accept: "application/vnd.github.text-match+json",
    });

    if (!res.ok) {
      return fallbackAsync(
        res.status === 403 || res.status === 429
          ? "GitHub API rate limit reached (set GETLIB_GITHUB_TOKEN for 5000 req/hr)."
          : `GitHub code search unavailable (HTTP ${res.status} - it requires GETLIB_GITHUB_TOKEN).`,
      );
    }

    const bodyText = await deps.readBodyCapped(res, 512 * 1024);
    if (bodyText === null) {
      return fallbackAsync("GitHub code search returned an oversized response.");
    }
    let raw: unknown = null;
    try {
      raw = JSON.parse(bodyText) as unknown;
    } catch {
      return fallbackAsync("GitHub code search returned malformed JSON.");
    }
    const envelope = parseExternal(externalSchemas.githubCodeSearch, raw);
    if (!envelope) {
      return fallbackAsync("GitHub code search returned an unexpected payload.");
    }
    const rawItems = Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : [];
    const items: CodeSearchItem[] = [];
    for (const candidate of rawItems) {
      const parsed = codeSearchItemSchema.safeParse(candidate);
      if (parsed.success) items.push(parsed.data as CodeSearchItem);
    }
    if (items.length === 0) {
      return fallbackAsync(
        "GitHub code search returned no results.",
        `No code examples found for "${library}"${pattern ? ` with pattern "${pattern}"` : ""}. Try a different search term.`,
      );
    }

    const { text: rendered, response } = renderCodeSearch({
      library,
      pattern,
      language,
      totalCount: envelope.total_count,
      items,
    });
    const ttl = 60 * 60 * 1000;
    deps.cacheSet(cacheKey, rendered, ttl);
    void deps.diskCacheSet(cacheKey, rendered, ttl);
    return { response, resolved: true };
  } catch {
    return fallbackAsync(
      "GitHub code search failed (network error).",
      `Failed to search GitHub for "${library}" examples. Check network and GETLIB_GITHUB_TOKEN.`,
    );
  }
}
