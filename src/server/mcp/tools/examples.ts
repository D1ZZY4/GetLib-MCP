import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { noteToolSubject, withTelemetry } from "../services/telemetry";
import { withToolTimeout } from "../utils/guard";
import { nonBlankString } from "../utils/schemas";
import { timeoutResponse } from "./timeout";
import { examplesUseCase } from "@/application/library/examples.service";
import { liveExamplesDeps } from "../infrastructure/deps/examples-deps";

const InputSchema = z.object({
  library: nonBlankString(200)
    .describe("Library or package name to find examples for, e.g. 'drizzle-orm', 'tanstack/query', 'fastapi'"),
  pattern: z.string().max(300).optional()
    .describe("Specific usage pattern to search for, e.g. 'middleware', 'useMutation', 'auth guard'"),
  language: z.string().max(50).optional()
    .describe("Programming language filter: 'typescript', 'python', 'rust', 'go'"),
  maxResults: z.number().int().min(1).max(10).default(5)
    .describe("Number of code examples to return (default: 5, max: 10)"),
});

/** Returned when the whole pipeline exceeds the tool timeout - an actionable
 *  next step beats a hung call or an MCP-level timeout error. */
const TIMEOUT_RESPONSE = timeoutResponse(
  "Example search timed out. Retry, or call gl_get_docs with the same pattern as the topic.",
  { timedOut: true },
);

export function registerExamplesTools(): void {
  defineTool({
    name: "gl_examples",
      title: "Find Real-World Code Examples",
      description: `Search GitHub for real-world usage examples of any library or pattern. Returns code snippets from popular open-source projects with repository attribution.

Requires GETLIB_GITHUB_TOKEN env var for higher rate limits (5000 req/hr vs 60 unauthenticated).

Source: open-source GitHub repositories (not the library's own docs). Use this when you want to see how real projects use a library. For code snippets extracted from the library's own documentation, use gl_snippets instead.`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      const { library, pattern, language, maxResults } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_examples", async (ctx) => {
        noteToolSubject(ctx, library);
        ctx.resolved = true;
        return withToolTimeout(async () => {
          const { response } = await examplesUseCase(
            {
              library,
              ...(pattern !== undefined ? { pattern } : {}),
              ...(language !== undefined ? { language } : {}),
              maxResults,
            },
            liveExamplesDeps,
          );
          return response;
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
