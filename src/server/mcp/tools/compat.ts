import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { withTelemetry } from "../services/telemetry";
import { withToolTimeout } from "../utils/guard";
import { timeoutResponse } from "./timeout";
import { nonBlankString } from "../utils/schemas";
import { DEFAULT_TOKEN_LIMIT, MAX_TOKEN_LIMIT } from "../constants";
import { compatUseCase } from "@/application/compat/compat.service";
import { liveCompatDeps } from "../infrastructure/deps/compat-deps";

const InputSchema = z.object({
  feature: nonBlankString(300)
    .describe(
      "Feature to check: 'CSS container queries', 'Array.at()', 'fetch() browser support', 'WebAssembly'",
    ),
  environments: z
    .array(nonBlankString(50))
    .min(1)
    .max(10)
    .optional()
    .describe("Environments to focus on, e.g. ['chrome', 'firefox', 'safari', 'node', 'deno']"),
  tokens: z
    .number()
    .int()
    .min(1000)
    .max(MAX_TOKEN_LIMIT)
    .default(DEFAULT_TOKEN_LIMIT)
    .describe("Max tokens for content"),
});

/** Returned when the whole pipeline exceeds the tool timeout - an actionable
 *  next step beats a hung call or an MCP-level timeout error. */
const TIMEOUT_RESPONSE = timeoutResponse(
  "Compatibility lookup timed out. Retry with a narrower feature name, or check the MDN page directly.",
  { timedOut: true },
);

export function registerCompatTools(): void {
  defineTool({
    name: "gl_compat",
      title: "Check Browser/Runtime Compatibility",
      description: `Check browser, Node.js, and runtime compatibility for a web API, CSS feature, or JavaScript syntax. Fetches live data from MDN Web Docs and caniuse.com.

Use this when the question is specifically about which browsers or runtimes support a feature (e.g. "does Safari support container queries?", "which Node.js version added Array.at()"). Takes a feature string - not a library name. For general library docs or best practices, use gl_get_docs or gl_best_practices instead.`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      const { feature, environments, tokens } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_compat", async (ctx) => {
        ctx.resolved = true;
        return withToolTimeout(async () => {
          const { response } = await compatUseCase(
            {
              feature,
              ...(environments !== undefined ? { environments } : {}),
              tokens,
            },
            liveCompatDeps,
          );
          return response;
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
