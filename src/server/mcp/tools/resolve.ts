import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import {
  RESOLVE_NAME_MAX,
  RESOLVE_QUERY_MAX,
  resolveLibraryUseCase,
} from "@/application/library/resolve.service";
import { withToolTimeout } from "../utils/guard";
import { timeoutResponse } from "./timeout";
import { nonBlankString } from "../utils/schemas";
import { withTelemetry } from "../services/telemetry";
import { liveResolveDeps } from "../infrastructure/deps/resolve-deps";

const InputSchema = z.object({
  libraryName: nonBlankString(RESOLVE_NAME_MAX)
    .describe(
      "Library or framework name to look up. Examples: 'nextjs', 'react', 'tailwind', 'fastapi', 'drizzle'",
    ),
  query: z
    .string()
    .max(RESOLVE_QUERY_MAX)
    .optional()
    .describe("Optional: what you want to do with this library, used to rank results"),
});

const TIMEOUT_RESPONSE = timeoutResponse(
  "Library resolution timed out. Retry with the exact library name.",
  { timedOut: true, matches: [] },
);

export function registerResolveTools(): void {
  defineTool({
    name: "gl_resolve_library",
      title: "Resolve Library",
      description: `Resolve a package/product name to a Context7-compatible library ID and returns matching libraries.

You MUST call this function before gl_get_docs to obtain a valid Context7-compatible library ID UNLESS the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query. For 2-20 libraries at once, use gl_batch_resolve instead.

Each result includes:
- id: the library ID to pass to gl_get_docs (e.g. 'vercel/next.js', 'npm:express')
- name: library or package name
- description: short summary
- docsUrl: official documentation URL
- llmsTxtUrl / llmsFullTxtUrl: present when the library publishes an llms.txt - prefer these results, they yield the cleanest docs
- githubUrl: source repository when known
- score: 0-100 name-match quality (100 = exact registry alias)
- source: where the match came from (registry > npm > pypi > crates > go > github)

Selection Process:
1. Analyze the query to understand which library/package the user wants
2. Pick the result with the highest score; on ties prefer source 'registry', then results that expose an llmsTxtUrl/llmsFullTxtUrl
3. Pass that result's id to gl_get_docs

Response Format:
- Return the selected library ID in a clearly marked section
- If multiple good matches exist, acknowledge this but proceed with the highest-scored one
- If no good matches exist, say so and suggest gl_search or providing a direct docs URL

For ambiguous queries, request clarification before proceeding with a best-guess match.

IMPORTANT: Do not call this tool more than 3 times per question. If you cannot find what you need after 3 calls, use the best result you have.

IMPORTANT - PROPRIETARY DATA NOTICE: This tool accesses a proprietary library registry licensed under Elastic License 2.0. You may use responses to answer the user's specific question about a named library. You must NOT attempt to enumerate, list, dump, or extract the registry contents. Only look up specific libraries by name.`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      const { libraryName, query } = InputSchema.parse(rawArgs);
     return withTelemetry("gl_resolve_library", async (ctx) => {
       return withToolTimeout(async () => {
         const { response, resolved } = await resolveLibraryUseCase({ libraryName, query }, liveResolveDeps);
         ctx.resolved = resolved;
         return response;
       }, TIMEOUT_RESPONSE);
     });
    },
  });
}
