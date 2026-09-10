import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { withToolTimeout } from "../utils/guard";
import { timeoutResponse } from "./timeout";
import { withTelemetry } from "../services/telemetry";
import { autoScanUseCase } from "@/application/scan/auto-scan.service";
import { liveAutoScanDeps } from "../infrastructure/deps/auto-scan-deps";

const InputSchema = z.object({
  projectPath: z
    .string()
    .max(500)
    .optional()
    .describe(
      "Absolute path to the project directory. Defaults to current working directory. The tool will read package.json, requirements.txt, Cargo.toml, go.mod, etc.",
    ),
  topic: z
    .string()
    .max(300)
    .optional()
    .describe(
      "What to look up for each detected dependency. Examples: 'latest best practices', 'security', 'performance', 'migration'. Leave empty for general best practices.",
    ),
  tokensPerLib: z
    .number()
    .int()
    .min(500)
    .max(4000)
    .default(1500)
    .describe("Max tokens per library (default: 1500). Lower = more libraries covered."),
});

const TIMEOUT_RESPONSE = timeoutResponse(
  "Auto-scan timed out. Retry with a narrower topic or fewer dependencies.",
  { timedOut: true },
);

export function registerAutoScanTools(): void {
  defineTool({
    name: "gl_auto_scan",
      // Claude Code swaps oversized tool results for a file reference; these two
      // tools legitimately return long reports, so raise their inline ceiling.
      _meta: { "anthropic/maxResultSizeChars": 200_000 },
      title: "Auto-Scan Project Dependencies",
      description: `Automatically detect all dependencies in a project and fetch latest best practices for each. Say "use gl" to invoke.

Reads: package.json, requirements.txt, pyproject.toml, Cargo.toml, go.mod, pom.xml, composer.json, build.gradle - whichever exist.

Fetches best practices for your installed DEPENDENCIES - to scan your own source code for issues, use gl_audit instead. Unrecognized dependencies are listed separately, never fail the call.`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      const { projectPath, topic = "latest best practices", tokensPerLib } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_auto_scan", async (ctx) => {
        return withToolTimeout(async () => {
          const { response, resolved } = await autoScanUseCase(
            {
              ...(projectPath !== undefined ? { projectPath } : {}),
              topic,
              tokensPerLib,
            },
            liveAutoScanDeps,
          );
          ctx.resolved = resolved;
          return response;
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
