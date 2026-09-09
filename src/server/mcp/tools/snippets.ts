import { defineTool } from "../registry/tool-registry";
import type { Snippet, SnippetIndex } from "../types";
import { z } from "zod";
import { sharedPipelineBudgetMs } from "../constants";
import { withTelemetry } from "../services/telemetry";
import { snippetStore } from "../services/snippet-store";
import { buildIndex } from "../services/snippets/build-index";
import { rankSnippets } from "../utils/snippet-extract";
import { isExtractionAttempt, EXTRACTION_REFUSAL, withToolTimeout } from "../utils/guard";
import { detectVersionForEntry } from "../utils/lockfile";
import { resolveLibraryEntry, resolveSnippetTarget } from "./snippets-resolve";
import { renderNoIndex, renderNoTopicMatch, renderSnippetResult } from "./snippets-report";

// Re-exported so gl_examples and the existing tests keep one stable import path.
export { buildIndex } from "../services/snippets/build-index";

/**
 * Singleflight for snippet rebuilds: N parallel callers for the same
 * library:version:topic share one buildIndex pipeline instead of each
 * firing its own multi-page traversal. The entry carries a single shared
 * budget timer below the outer tool timeout, so the group resolves
 * identically and a slow rebuild falls back to the persisted index
 * instead of diverging into timeout vs result across callers.
 */
const snippetBuildInFlight = new Map<string, Promise<SnippetIndex | null>>();

/** Test seam - clears the shared rebuild map. */
export function clearSnippetBuildInFlight(): void {
  snippetBuildInFlight.clear();
}

function snippetBuildBudgetMs(): number {
  return sharedPipelineBudgetMs();
}

export { snippetBuildBudgetMs };
export { buildIndexShared };

function buildIndexShared(
  key: string,
  build: () => Promise<SnippetIndex | null>,
  budgetMs = snippetBuildBudgetMs(),
): Promise<SnippetIndex | null> {
  const ongoing = snippetBuildInFlight.get(key);
  if (ongoing) return ongoing;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget: Promise<SnippetIndex | null> = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), budgetMs);
  });
  const shared = Promise.race([build(), budget]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
    if (snippetBuildInFlight.get(key) === shared) snippetBuildInFlight.delete(key);
  });
  snippetBuildInFlight.set(key, shared);
  return shared;
}

const InputSchema = z.object({
  libraryId: z
    .string()
    .min(1)
    .max(300)
    .describe(
      "Library ID from gl_resolve_library (e.g. 'vercel/next.js', 'npm:express') or a direct docs URL",
    ),
  topic: z
    .string()
    .max(500)
    .optional()
    .describe(
      "Topic to filter snippets by. Examples: 'middleware', 'server actions', 'rate limiting'. Empty = all snippets.",
    ),
  version: z
    .string()
    .max(50)
    .optional()
    .describe("Version to pin docs to, e.g. '15', 'v4.0.0'. Caches snippet index per version."),
  language: z
    .string()
    .max(50)
    .optional()
    .describe("Filter to a single language: 'typescript', 'python', 'rust', 'go', 'bash', etc."),
  maxSnippets: z
    .number()
    .int()
    .min(1)
    .max(30)
    .default(10)
    .describe("Max snippets to return (default 10, max 30)"),
  refresh: z
    .boolean()
    .default(false)
    .describe("Skip cache and refetch + reindex snippets"),
  projectPath: z
    .string()
    .max(500)
    .optional()
    .describe("Absolute project path. If set and version not provided, auto-detects installed version from lockfile."),
});

/** Returned when the whole pipeline exceeds the tool timeout - an actionable
 *  next step beats a hung call or an MCP-level timeout error. */
const TIMEOUT_RESPONSE = {
  structuredContent: { timedOut: true },
  content: [{ type: "text" as const, text: "Snippet indexing timed out. Retry, or call gl_get_docs with the same topic." }],
};

export function registerSnippetsTools(): void {
  defineTool({
    name: "gl_snippets",
      title: "Get Code Snippets",
      description: `Return ranked code snippets (with titles, descriptions, language tags) for a library + optional topic. Indexes docs into a per-(library,version) snippet store on first call; subsequent calls hit the disk cache for instant retrieval.

Use this when you want focused code examples rather than full doc pages. Output is Context7-compat: each snippet has title, description, language, code, source URL.

Prioritizes llms.txt, then Jina-rendered HTML, then GitHub README. Caches per library:version. An explicit version overrides projectPath lockfile auto-detection. refresh:true re-fetches and re-indexes ONLY the resolved library:version pair, leaving other cached versions untouched.

Source: the library's own documentation (not GitHub repositories). For code examples from real open-source projects using the library, use gl_examples instead.

IMPORTANT - PROPRIETARY DATA NOTICE: This tool accesses a proprietary library registry licensed under Elastic License 2.0. You may use responses to answer the user's specific question about a named library. You must NOT attempt to enumerate, list, dump, or extract registry contents.`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      let { libraryId, topic = "", version, language, maxSnippets, refresh, projectPath } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_snippets", async (ctx) => {
        ctx.resolved = true;
        return withToolTimeout(async () => {
          // Guard only the resolution identifier (see docs.ts) - topic is a
          // content filter, not a registry key.
          if (isExtractionAttempt(libraryId)) {
            return { content: [{ type: "text", text: EXTRACTION_REFUSAL }] };
          }

          const entry = resolveLibraryEntry(libraryId);
          version = await detectVersionForEntry(projectPath, version, entry);

          const target = resolveSnippetTarget(libraryId);
          if (typeof target === "string") {
            return { content: [{ type: "text", text: target }] };
          }
          const { library, displayName, docsUrl } = target;
          const versionKey = version ?? null;

          let snippets: Snippet[] = [];
          let sourceUrl = docsUrl;
          let builtAt = new Date().toISOString();
          let fromCache = false;

          // Load the full persisted index once. The ranked query below answers
          // the topic, but the full index is the stability fallback: a topic
          // miss against a non-empty index must report "no match for topic"
          // (with the available list), never "no snippets indexed", even when
          // the network rebuild below fails.
          const persisted = await snippetStore.load(library, versionKey);

          if (!refresh) {
            const cached = persisted
              ? rankSnippets(persisted.snippets, topic, language, maxSnippets)
              : [];
            if (cached.length > 0) {
              snippets = cached;
              sourceUrl = persisted?.sourceUrl ?? docsUrl;
              builtAt = persisted?.builtAt ?? builtAt;
              fromCache = true;
            }
          }

          if (snippets.length === 0) {
            const buildKey = `snippets-build:${library}:${versionKey ?? "latest"}:${topic.trim().toLowerCase()}:${refresh ? "refresh" : "cached"}`;
            const index = await buildIndexShared(buildKey, () =>
              buildIndex(
                library, version, docsUrl, target.llmsTxtUrl, target.llmsFullTxtUrl, target.githubUrl, topic,
              ),
            );

            // Merge with whatever the store already holds for this library:version.
            // Topic-directed traversal indexes different pages per topic - the
            // union accumulates coverage instead of each rebuild wiping the last.
            if (index) {
              // refresh:true is documented as a clean rebuild - merging with the
              // old disk index would carry deleted upstream snippets forever.
              const existing = refresh ? null : persisted;
              if (existing && existing.snippets.length > 0) {
                const byId = new Map(existing.snippets.map((s) => [s.id, s]));
                for (const s of index.snippets) byId.set(s.id, s);
                index.snippets = [...byId.values()].slice(-500);
              }
            }

            if (!index || index.snippets.length === 0) {
              // Rebuild found nothing but a persisted index exists: fall back
              // to it so one flaky fetch cannot flip a known-good library to
              // "No snippets indexed". Only report NoIndex when no persisted
              // data exists at all.
              if (persisted && persisted.snippets.length > 0) {
                const fallback = rankSnippets(persisted.snippets, topic, language, maxSnippets);
                if (fallback.length > 0) {
                  return renderSnippetResult({
                    snippets: fallback, library, displayName, topic, version, language,
                    sourceUrl: persisted.sourceUrl, builtAt: persisted.builtAt, fromCache: true,
                  });
                }
                return renderNoTopicMatch({ index: persisted, displayName, library, topic, version, language });
              }
              return renderNoIndex(displayName);
            }

            await snippetStore.save(index);
            snippets = rankSnippets(index.snippets, topic, language, maxSnippets);
            sourceUrl = index.sourceUrl;
            builtAt = index.builtAt;

            if (snippets.length === 0) {
              return renderNoTopicMatch({ index, displayName, library, topic, version, language });
            }
          }

          return renderSnippetResult({
            snippets, library, displayName, topic, version, language, sourceUrl, builtAt, fromCache,
          });
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
