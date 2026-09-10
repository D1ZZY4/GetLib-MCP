import { isExtractionAttempt, EXTRACTION_REFUSAL } from "@/server/mcp/utils/guard";
import { sharedPipelineBudgetMs } from "@/server/mcp/constants";
import { renderNoIndex, renderNoTopicMatch, renderSnippetResult } from "./snippets-report";
import type { LibraryEntry, Snippet, SnippetIndex } from "@/server/mcp/types";
import type { SnippetTarget } from "@/server/mcp/services/snippets/resolve";

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

export function buildIndexShared(
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

/**
 * Capability seams of the snippets use case. Target resolution, version
 * detection, the persisted store, ranking, and index building are
 * infrastructure injected here. Result rendering is an
 * application-owned sibling imported directly; shared protection stays
 * imported as cross-cutting technical infrastructure.
 */
export interface SnippetsDeps {
  resolveLibraryEntry: (libraryId: string) => LibraryEntry | undefined;
  detectVersionForEntry: (
    projectPath: string | undefined,
    version: string | undefined,
    entry: Pick<LibraryEntry, "id" | "npmPackage" | "pypiPackage"> | null | undefined,
  ) => Promise<string | undefined>;
  resolveSnippetTarget: (libraryId: string) => SnippetTarget | string;
  storeLoad: (library: string, version: string | null) => Promise<SnippetIndex | null>;
  storeSave: (index: SnippetIndex) => Promise<void>;
  rankSnippets: (
    snippets: Snippet[],
    topic: string,
    language: string | undefined,
    maxSnippets: number,
  ) => Snippet[];
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

export interface SnippetsInput {
  libraryId: string;
  topic: string;
  version?: string;
  language?: string;
  maxSnippets: number;
  refresh: boolean;
  projectPath?: string;
}

export interface SnippetsApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  };
  resolved: boolean;
}

/**
 * Code-snippets use case shared by the MCP tool and any future consumer.
 * Owns the full pipeline: extraction guard, version detection, target
 * resolution, persisted-index fast path, singleflight bounded rebuild
 * with store merge, topic-miss reporting, render. Transport adapters
 * only validate input, inject the live infrastructure adapters, and map
 * this result. The internal `done` helper keeps the envelope shaping in
 * one place; every branch returns through it.
 */
export async function snippetsUseCase(input: SnippetsInput, deps: SnippetsDeps): Promise<SnippetsApplicationResult> {
  const done = (response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  }): SnippetsApplicationResult => ({ response, resolved: true });
  // Guard only the resolution identifier (see docs.ts) - topic is a
  // content filter, not a registry key.
  if (isExtractionAttempt(input.libraryId)) {
    return done({ content: [{ type: "text", text: EXTRACTION_REFUSAL }] });
  }

  const entry = deps.resolveLibraryEntry(input.libraryId);
  const version = await deps.detectVersionForEntry(input.projectPath, input.version, entry);

  const target = deps.resolveSnippetTarget(input.libraryId);
  if (typeof target === "string") {
    return done({ content: [{ type: "text", text: target }] });
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
  const persisted = await deps.storeLoad(library, versionKey);

  if (!input.refresh) {
    const cached = persisted
      ? deps.rankSnippets(persisted.snippets, input.topic, input.language, input.maxSnippets)
      : [];
    if (cached.length > 0) {
      snippets = cached;
      sourceUrl = persisted?.sourceUrl ?? docsUrl;
      builtAt = persisted?.builtAt ?? builtAt;
      fromCache = true;
    }
  }

  if (snippets.length === 0) {
    const buildKey = `snippets-build:${library}:${versionKey ?? "latest"}:${input.topic.trim().toLowerCase()}:${input.refresh ? "refresh" : "cached"}`;
    const index = await buildIndexShared(buildKey, () =>
      deps.buildIndex(
        library,
        version,
        docsUrl,
        target.llmsTxtUrl,
        target.llmsFullTxtUrl,
        target.githubUrl,
        input.topic,
      ),
    );

    // Merge with whatever the store already holds for this library:version.
    // Topic-directed traversal indexes different pages per topic - the
    // union accumulates coverage instead of each rebuild wiping the last.
    if (index) {
      // refresh:true is documented as a clean rebuild - merging with the
      // old disk index would carry deleted upstream snippets forever.
      const existing = input.refresh ? null : persisted;
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
        const fallback = deps.rankSnippets(persisted.snippets, input.topic, input.language, input.maxSnippets);
        if (fallback.length > 0) {
          return done(
            renderSnippetResult({
              snippets: fallback,
              library,
              displayName,
              topic: input.topic,
              version,
              language: input.language,
              sourceUrl: persisted.sourceUrl,
              builtAt: persisted.builtAt,
              fromCache: true,
            }),
          );
        }
        return done(renderNoTopicMatch({ index: persisted, displayName, library, topic: input.topic, version, language: input.language }));
      }
      return done(renderNoIndex(displayName));
    }

    await deps.storeSave(index);
    snippets = deps.rankSnippets(index.snippets, input.topic, input.language, input.maxSnippets);
    sourceUrl = index.sourceUrl;
    builtAt = index.builtAt;

    if (snippets.length === 0) {
      return done(renderNoTopicMatch({ index, displayName, library, topic: input.topic, version, language: input.language }));
    }
  }

  return done(
    renderSnippetResult({
      snippets,
      library,
      displayName,
      topic: input.topic,
      version,
      language: input.language,
      sourceUrl,
      builtAt,
      fromCache,
    }),
  );
}
