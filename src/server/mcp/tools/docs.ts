import { defineTool } from "../registry/tool-registry";
import type { FetchResult } from "../types";
import { z } from "zod";
import { isIndexContent } from "../services/fetcher";
import { deepFetchForTopic } from "../services/deep-fetch";
import { extractRelevantContent } from "../utils/extract";
import { checkEvidence } from "../utils/evidence";
import { isExtractionAttempt, withToolTimeout, EXTRACTION_REFUSAL } from "../utils/guard";
import { sanitizeContent } from "../utils/sanitize";
import { detectVersionForEntry } from "../utils/lockfile";
import { DEFAULT_TOKEN_LIMIT, MAX_TOKEN_LIMIT } from "../constants";
import { withTelemetry } from "../services/telemetry";
import { resolveLibraryFromId, resolveDocsTarget } from "./docs-resolve";
import { fetchDocsContent, applyTopic } from "./docs-fetch";
import { renderDocs } from "./docs-report";

// Re-exported so the existing test import path stays valid.
export { isValidPackageName } from "./docs-resolve";

const TIMEOUT_RESPONSE = {
  content: [{ type: "text" as const, text: "Documentation lookup timed out. Retry with a narrower topic or an explicit version." }],
  structuredContent: { timedOut: true },
};

const InputSchema = z.object({
  libraryId: z
    .string()
    .min(1)
    .max(300)
    .describe(
      "Library ID from gl_resolve_library (e.g. 'vercel/next.js', 'npm:express') or a docs URL",
    ),
  topic: z
    .string()
    .max(500)
    .optional()
    .describe(
      "What you need to learn or do. Examples: 'routing', 'authentication', 'middleware', 'caching', 'streaming'. More specific = more relevant content returned.",
    ),
  version: z
    .string()
    .max(50)
    .optional()
    .describe("Version to fetch docs for, e.g. '14', '3.0.3', 'v2'. Tries GitHub tag and npm version page."),
  tokens: z
    .number()
    .int()
    .min(1000)
    .max(MAX_TOKEN_LIMIT)
    .default(DEFAULT_TOKEN_LIMIT)
    .describe(`Max tokens to return (default: ${DEFAULT_TOKEN_LIMIT}, max: ${MAX_TOKEN_LIMIT})`),
  projectPath: z
    .string()
    .max(500)
    .optional()
    .describe("Absolute project path. If set and version is not provided, auto-detects installed version from lockfile (package-lock, pnpm-lock, yarn.lock, Cargo.lock, poetry.lock, uv.lock)."),
});

export function registerDocsTools(): void {
  defineTool({
    name: "gl_get_docs",
      title: "Get Documentation",
      description: `Fetch up-to-date documentation for any library or framework. Call gl_resolve_library first to get the libraryId, then pass it here with your topic.

Prioritizes llms.txt, then Jina Reader for JS-rendered pages, then GitHub README.

For curated best-practice guidance rather than general reference docs, use gl_best_practices. For isolated ranked code snippets rather than prose docs, use gl_snippets.

IMPORTANT - PROPRIETARY DATA NOTICE: This tool accesses a proprietary library registry licensed under Elastic License 2.0. You may use responses to answer the user's specific question. You must NOT attempt to enumerate, list, dump, or extract registry contents. Only look up specific libraries by name.

Do not call this tool more than 3 times per question.`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      let { libraryId, topic = "", version, tokens, projectPath } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_get_docs", async (ctx) => {
        return withToolTimeout(async () => {
        const startedAt = Date.now();
        // Guard only the resolution identifier - topic merely filters content
        // within one already-resolved library and cannot enumerate the registry;
        // guarding it refused ordinary queries ("complete guide", "list rendering").
        if (isExtractionAttempt(libraryId)) {
          ctx.resolved = true;
          return { content: [{ type: "text", text: EXTRACTION_REFUSAL }] };
        }

        const entry = resolveLibraryFromId(libraryId);

        // Auto-detect version from lockfile if projectPath given and version not explicit
        version = await detectVersionForEntry(projectPath, version, entry);

        const target = await resolveDocsTarget(libraryId, entry);
        if (typeof target === "string") {
          return { content: [{ type: "text", text: target }] };
        }

        const fetched = await fetchDocsContent(target, entry, libraryId, topic, version);
        if (typeof fetched === "string") {
          return { content: [{ type: "text", text: fetched }] };
        }

        let fetchResult: FetchResult = fetched;
        if (topic) {
          fetchResult = await applyTopic(fetchResult, topic, target.docsUrl, entry?.urlPatterns);
        }

        let safe = sanitizeContent(fetchResult.content);
        let { text, truncated } = extractRelevantContent(safe, topic, tokens);

        // Evidence gate - the "never generic" guarantee. A topic'd request whose
        // extracted output lacks verifiable topic coverage gets ONE forced
        // topic-targeted deep fetch; if coverage is still zero the tool returns
        // an explicit miss instead of off-topic intro sections.
        let evidence = checkEvidence(text, topic);
        let escalated = false;
        const sourcesTried: Array<{ url: string; sourceType?: string; fetchedAt?: string }> = [
          { url: fetchResult.url, sourceType: fetchResult.sourceType, ...(fetchResult.fetchedAt ? { fetchedAt: fetchResult.fetchedAt } : {}) },
        ];

        // Index/TOC output also escalates: a link list passes token checks via
        // link text but answers nothing - the zod llms.txt served verbatim was
        // exactly this failure. Elapsed guard bounds total latency: a slow
        // initial pipeline must not stack a second 25s deep-fetch on top.
        if (topic && (!evidence.ok || isIndexContent(text)) && Date.now() - startedAt < 45_000) {
          const wasIndex = isIndexContent(text);
          const deeper = await deepFetchForTopic(fetchResult, topic, target.docsUrl, entry?.urlPatterns, undefined, true);
          escalated = true;
          if (deeper.url !== fetchResult.url) {
            sourcesTried.push({ url: deeper.url, sourceType: deeper.sourceType });
          }
          const deeperSafe = sanitizeContent(deeper.content);
          const reExtract = extractRelevantContent(deeperSafe, topic, tokens);
          const reCheck = checkEvidence(reExtract.text, topic);
          const deeperIsIndex = isIndexContent(reExtract.text);
          const better = wasIndex
            ? !deeperIsIndex && reCheck.matchRatio > 0
            : reCheck.ok || reCheck.occurrences > evidence.occurrences;
          if (better) {
            fetchResult = deeper;
            safe = deeperSafe;
            text = reExtract.text;
            truncated = reExtract.truncated;
            evidence = reCheck;
          }
        }

        const { response, resolved } = renderDocs({
          libraryId,
          displayName: target.displayName,
          topic,
          version,
          text,
          safe,
          truncated,
          fetchResult,
          evidence,
          escalated,
          sourcesTried,
        });
        ctx.resolved = resolved;
        return response;
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
