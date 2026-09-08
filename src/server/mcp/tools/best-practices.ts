import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { isExtractionAttempt, withToolTimeout, EXTRACTION_REFUSAL } from "../utils/guard";
import { DEFAULT_TOKEN_LIMIT, MAX_TOKEN_LIMIT } from "../constants";
import { withTelemetry } from "../services/telemetry";
import { resolveBestPracticesTarget } from "../services/best-practices/target";
import { fetchBestPracticesContent } from "../services/best-practices/fetch";
import { escalateWeakEvidence } from "../services/best-practices/escalate";
import { renderBestPractices } from "./best-practices-report";

// Re-exported so the existing test import path stays valid.
export { raceUrls } from "../services/best-practices/race";

const TIMEOUT_RESPONSE = {
  content: [{ type: "text" as const, text: "Best-practices lookup timed out. Retry with a narrower topic." }],
  structuredContent: { timedOut: true },
};

const UNRESOLVED_HELP = [
  "**What to try next:**",
  "- Run gl_resolve_library to find the correct library ID",
  "- Try gl_search with a freeform query (e.g. 'React performance best practices')",
  "- Use the npm/PyPI package name or a direct docs URL",
].join("\n");

const InputSchema = z.object({
  libraryId: z
    .string()
    .min(1)
    .max(300)
    .describe("Library ID (from gl_resolve_library), npm:package, pypi:package, or library name like 'nextjs', 'react'"),
  topic: z
    .string()
    .max(300)
    .optional()
    .describe(
      "Specific area: 'performance', 'security', 'testing', 'deployment', 'migration', 'patterns', 'v4 migration'. Leave empty for general best practices.",
    ),
  version: z
    .string()
    .max(50)
    .optional()
    .describe("Version to scope results to, e.g. '14', '3.0.3'. Focuses extraction on version-specific patterns."),
  tokens: z
    .number()
    .int()
    .min(1000)
    .max(MAX_TOKEN_LIMIT)
    .default(DEFAULT_TOKEN_LIMIT)
    .describe("Max tokens to return"),
});

// Known best practices / guide URLs per library - 363+ entries

export function registerBestPracticesTools(): void {
  defineTool({
    name: "gl_best_practices",
      title: "Get Best Practices",
      description: `Fetch latest best practices, patterns, and guidelines for a library or framework. Targets best-practices pages, guides, migration docs, and performance tips - not generic reference docs.

Prefer this over gl_search when the question centers on ONE resolvable library (version-accurate, registry-backed); use gl_search for cross-cutting or non-library topics.

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
      const { libraryId, topic = "", version, tokens } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_best_practices", async (ctx) => {
        return withToolTimeout(async () => {
        // Guard only the resolution identifier (see docs.ts) - topic is a
        // content filter, not a registry key.
        if (isExtractionAttempt(libraryId)) {
          ctx.resolved = true;
          return { content: [{ type: "text", text: EXTRACTION_REFUSAL }] };
        }

        const target = await resolveBestPracticesTarget(libraryId);
        if (!target) {
          ctx.resolved = false;
          return {
            content: [{ type: "text", text: `Could not resolve "${libraryId}".\n\n${UNRESOLVED_HELP}` }],
          };
        }
        const { docsUrl, displayName, resolvedId, bestPracticesPaths } = target;

        const effectiveTopic = version
          ? `${topic ? `${topic} ` : ""}v${version.replace(/^v/, "")}`.trim()
          : topic;

        const fetched = await fetchBestPracticesContent(
          resolvedId,
          docsUrl,
          target.llmsTxtUrl,
          target.llmsFullTxtUrl,
          target.githubUrl,
          effectiveTopic,
          tokens,
          bestPracticesPaths,
        );

        const sourcesTried: Array<{ url: string; sourceType?: string }> = [
          { url: fetched.sourceUrl },
          ...fetched.extraSources.map((url) => ({ url })),
        ];

        const escalation = await escalateWeakEvidence({
          text: fetched.text,
          sourceUrl: fetched.sourceUrl,
          truncated: fetched.truncated,
          sourceType: fetched.sourceType,
          topic: effectiveTopic,
          docsUrl,
          tokens,
          bestPracticesPaths,
        });
        if (escalation.extraSource) sourcesTried.push(escalation.extraSource);

        ctx.resolved = effectiveTopic && escalation.evidence.matchRatio === 0
          ? false
          : escalation.text.length > 200;
        return renderBestPractices({
          displayName,
          resolvedId,
          topic: effectiveTopic,
          sourcesTried,
          ...escalation,
        });
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
