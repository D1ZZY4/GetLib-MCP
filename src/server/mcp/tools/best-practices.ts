import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { withToolTimeout } from "../utils/guard";
import { timeoutResponse } from "./timeout";
import { nonBlankString } from "../utils/schemas";
import { DEFAULT_TOKEN_LIMIT, MAX_TOKEN_LIMIT } from "../constants";
import { withTelemetry } from "../services/telemetry";
import { bestPracticesUseCase } from "@/application/library/best-practices.service";
import { liveBestPracticesDeps } from "../infrastructure/deps/best-practices-deps";

const TIMEOUT_RESPONSE = timeoutResponse(
  "Best-practices lookup timed out. Retry with a narrower topic.",
  { timedOut: true },
);

const InputSchema = z.object({
  libraryId: nonBlankString(300)
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

// Known best practices / guide URLs per library - 363+ entries (see
// services/best-practices and sources/best-practice-urls).

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
          const { response, resolved } = await bestPracticesUseCase(
            {
              libraryId,
              topic,
              ...(version !== undefined ? { version } : {}),
              tokens,
            },
            liveBestPracticesDeps,
          );
          ctx.resolved = resolved;
          return response;
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
