import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { withTelemetry } from "../services/telemetry";
import { withToolTimeout } from "../utils/guard";
import { timeoutResponse } from "./timeout";
import { nonBlankString } from "../utils/schemas";
import { compareUseCase } from "@/application/library/compare.service";
import { liveCompareDeps } from "../infrastructure/deps/compare-deps";

const InputSchema = z.object({
  libraries: z
    .array(nonBlankString(100))
    .min(2)
    .max(3)
    .describe("2–3 library names to compare, e.g. ['prisma', 'drizzle-orm']"),
  criteria: z
    .string()
    .max(300)
    .optional()
    .describe("Comparison angle: 'performance', 'TypeScript support', 'bundle size', 'DX'"),
  tokens: z
    .number()
    .int()
    .min(500)
    .max(4000)
    .default(2000)
    .describe("Max tokens per library (2000 default)"),
});

/** Returned when the whole pipeline exceeds the tool timeout - an actionable
 *  next step beats a hung call or an MCP-level timeout error. */
const TIMEOUT_RESPONSE = timeoutResponse(
  "Comparison timed out. Retry with two libraries instead of three, or call gl_best_practices per library.",
);

export function registerCompareTools(): void {
  defineTool({
    name: "gl_compare",
      title: "Compare Libraries Side-by-Side",
      description: `Compare 2–3 libraries side-by-side. Fetches live documentation for each and presents content relevant to the comparison criteria.

Pass library NAMES (e.g. ['prisma', 'drizzle-orm']) - not registry IDs. The tool resolves them internally. Use for "X vs Y" or "which library should I choose" questions. For fetching docs about a single library, use gl_get_docs instead.`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      const { libraries, criteria, tokens } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_compare", async (ctx) => {
        ctx.resolved = true;
        return withToolTimeout(async () => {
          const { response } = await compareUseCase(
            {
              libraries,
              ...(criteria !== undefined ? { criteria } : {}),
              tokens,
            },
            liveCompareDeps,
          );
          return response;
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
