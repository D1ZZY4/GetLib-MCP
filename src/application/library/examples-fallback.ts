import { withNotice } from "@/server/mcp/utils/guard";
import type { LibraryEntry } from "@/server/mcp/types";
import type { SnippetIndex } from "@/server/mcp/types";
import { rankSnippets, renderSnippets } from "@/server/mcp/utils/snippet-extract";

export interface ExamplesResponse {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
}

/**
 * Capability seams of the docs-derived examples fallback. Registry
 * lookup and snippet-index building are infrastructure injected here
 * so the fallback stays testable without network or registry state.
 */
export interface ExamplesFallbackDeps {
  lookupById: (id: string) => LibraryEntry | null | undefined;
  lookupByAlias: (alias: string) => LibraryEntry | null | undefined;
  buildIndex: (
    library: string,
    version: string | undefined,
    docsUrl: string,
    llmsTxtUrl: string | undefined,
    llmsFullTxtUrl: string | undefined,
    githubUrl: string | undefined,
    topic: string,
  ) => Promise<SnippetIndex | null>;
}

/**
 * GitHub code search is auth-only - without GETLIB_GITHUB_TOKEN it always returns
 * 401. Instead of dead-ending, serve ranked code examples from the library's
 * official documentation and say so.
 */
async function docsExamples(
  deps: ExamplesFallbackDeps,
  library: string,
  pattern: string | undefined,
  maxResults: number,
  reason: string,
): Promise<{ text: string; sourceUrl: string; count: number } | null> {
  const entry = deps.lookupById(library) ?? deps.lookupByAlias(library);
  if (!entry) return null;
  const index = await deps
    .buildIndex(
      entry.id,
      undefined,
      entry.docsUrl,
      entry.llmsTxtUrl,
      entry.llmsFullTxtUrl,
      entry.githubUrl,
      pattern ?? "",
    )
    .catch(() => null);
  if (!index || index.snippets.length === 0) return null;
  const ranked = rankSnippets(index.snippets, pattern ?? "", undefined, maxResults);
  if (ranked.length === 0) return null;
  const text = withNotice(
    [
      `# Code Examples: ${library}${pattern ? ` - ${pattern}` : ""}`,
      `> ${reason} Showing examples from the official documentation instead.`,
      `> Source: ${index.sourceUrl}`,
      "",
      "---",
      "",
      renderSnippets(ranked),
    ].join("\n"),
  );
  return { text, sourceUrl: index.sourceUrl, count: ranked.length };
}

/** Documentation-derived examples, or an actionable message when there are none. */
export async function docsFallbackResponse(
  params: {
    library: string;
    pattern: string | undefined;
    language: string | undefined;
    maxResults: number;
    reason: string;
    /** Message when the docs fallback also came up empty. Defaults to the generic hint. */
    emptyText?: string;
  },
  deps: ExamplesFallbackDeps,
): Promise<ExamplesResponse> {
  const { library, pattern, language, maxResults, reason, emptyText } = params;
  const fallback = await docsExamples(deps, library, pattern, maxResults, reason).catch(() => null);
  if (fallback) {
    return {
      content: [{ type: "text", text: fallback.text }],
      structuredContent: {
        library,
        pattern,
        language,
        totalCount: fallback.count,
        source: "official-docs-fallback",
        sourceUrl: fallback.sourceUrl,
      },
    };
  }
  return {
    content: [{
      type: "text",
      text: emptyText
        ?? `${reason} No documentation-based examples found either - try gl_snippets with a registry libraryId, or set GETLIB_GITHUB_TOKEN.`,
    }],
  };
}
