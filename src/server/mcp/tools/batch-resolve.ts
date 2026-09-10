import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { withTelemetry } from "../services/telemetry";
import { withToolTimeout } from "../utils/guard";
import { timeoutResponse } from "./timeout";
import { nonBlankString } from "../utils/schemas";
import { batchResolveUseCase } from "@/application/library/batch-resolve.service";
import { liveBatchResolveDeps } from "../infrastructure/deps/batch-resolve-deps";

const InputSchema = z.object({
  libraryNames: z
    .array(nonBlankString(200))
    .min(1)
    .max(20)
    .describe("Array of library names to resolve (max 20). Example: ['react', 'next', 'tailwind']"),
});

/** Returned when the whole pipeline exceeds the tool timeout - an actionable
 *  next step beats a hung call or an MCP-level timeout error. */
const TIMEOUT_RESPONSE = timeoutResponse(
  "Library resolution timed out. Retry with fewer names, or call gl_resolve_library one name at a time.",
  {
    total: 0,
    found: 0,
    timedOut: true,
    results: [] as never[],
  },
);

export function registerBatchResolveTools(): void {
  defineTool({
    name: "gl_batch_resolve",
      title: "Batch Resolve Libraries",
      description: `Resolve multiple library names to IDs and docs URLs in a single call. Returns results for each library. Max 20 per call.

Use this when you already have a list of library names and need to batch-resolve them to IDs efficiently (e.g. before calling gl_get_docs for each). Registry-only lookup - no external npm/PyPI/crates fallback. For a single library with external fallback, use gl_resolve_library instead. For scanning a project's actual dependency files and fetching best practices, use gl_auto_scan instead.`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      const { libraryNames } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_batch_resolve", async (ctx) => {
        ctx.resolved = true;
        return withToolTimeout(async () => {
          const { response } = await batchResolveUseCase({ libraryNames }, liveBatchResolveDeps);
          return response;
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
