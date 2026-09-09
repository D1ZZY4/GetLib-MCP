import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { withToolTimeout } from "../utils/guard";
import { DEFAULT_TOKEN_LIMIT, MAX_TOKEN_LIMIT } from "../constants";
import { withTelemetry } from "../services/telemetry";
import {
  DOCS_LIBRARY_ID_MAX,
  DOCS_PROJECT_PATH_MAX,
  DOCS_TOPIC_MAX,
  DOCS_VERSION_MAX,
  fetchLibraryDocsUseCase,
} from "@/application/library/docs.service";

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
    .max(DOCS_LIBRARY_ID_MAX)
    .describe(
      "Library ID from gl_resolve_library (e.g. 'vercel/next.js', 'npm:express') or a docs URL",
    ),
  topic: z
    .string()
    .max(DOCS_TOPIC_MAX)
    .optional()
    .describe(
      "What you need to learn or do. Examples: 'routing', 'authentication', 'middleware', 'caching', 'streaming'. More specific = more relevant content returned.",
    ),
  version: z
    .string()
    .max(DOCS_VERSION_MAX)
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
    .max(DOCS_PROJECT_PATH_MAX)
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
      const input = InputSchema.parse(rawArgs);
      return withTelemetry("gl_get_docs", async (ctx) => {
        return withToolTimeout(async () => {
          const { response, resolved } = await fetchLibraryDocsUseCase(input);
          ctx.resolved = resolved;
          return response;
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
