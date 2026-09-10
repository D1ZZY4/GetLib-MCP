import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { withTelemetry } from "../services/telemetry";
import { withToolTimeout } from "../utils/guard";
import { timeoutResponse } from "./timeout";
import { nonBlankString } from "../utils/schemas";
import {
  buildIndexShared,
  clearSnippetBuildInFlight,
  snippetBuildBudgetMs,
  snippetsUseCase,
} from "@/application/library/snippets.service";
import { liveSnippetsDeps } from "../infrastructure/deps/snippets-deps";

// Re-exported so gl_examples and the existing tests keep one stable import path.
export { buildIndex } from "../services/snippets/build-index";
export { buildIndexShared, clearSnippetBuildInFlight, snippetBuildBudgetMs };

const InputSchema = z.object({
  libraryId: nonBlankString(300)
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
const TIMEOUT_RESPONSE = timeoutResponse(
  "Snippet indexing timed out. Retry, or call gl_get_docs with the same topic.",
  { timedOut: true },
);

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
      const { libraryId, topic = "", version, language, maxSnippets, refresh, projectPath } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_snippets", async (ctx) => {
        ctx.resolved = true;
        return withToolTimeout(async () => {
          const { response } = await snippetsUseCase(
            {
              libraryId,
              topic,
              ...(version !== undefined ? { version } : {}),
              ...(language !== undefined ? { language } : {}),
              maxSnippets,
              refresh,
              ...(projectPath !== undefined ? { projectPath } : {}),
            },
            liveSnippetsDeps,
          );
          return response;
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
