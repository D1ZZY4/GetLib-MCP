import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { withToolTimeout } from "../utils/guard";
import { timeoutResponse } from "./timeout";
import { withTelemetry } from "../services/telemetry";
import { auditProjectUseCase } from "@/application/audit/audit.service";
import { liveAuditDeps } from "../infrastructure/deps/audit-deps";

const InputSchema = z.object({
  projectPath: z
    .string()
    .max(500)
    .optional()
    .describe("Project directory. Defaults to current working directory."),
  categories: z
    .array(
      z.enum([
        "layout",
        "performance",
        "accessibility",
        "security",
        "react",
        "nextjs",
        "typescript",
        "node",
        "python",
        "vue",
        "svelte",
        "angular",
        "testing",
        "mobile",
        "api",
        "css",
        "seo",
        "i18n",
        "all",
      ]),
    )
    .min(1)
    .default(["all"])
    .describe('Issue categories to audit. Use "all" for broad questions. Default: all. Available: layout, performance, accessibility, security, react, nextjs, typescript, node, python, vue, svelte, angular, testing, mobile, api, css, seo, i18n.'),
  tokens: z
    .number()
    .int()
    .min(1000)
    .max(8000)
    .default(4000)
    .describe("Max tokens per best-practice fetch"),
  maxFiles: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .describe("Max source files to scan"),
});

const TIMEOUT_RESPONSE = timeoutResponse(
  "Audit timed out. Retry with fewer files or narrower categories.",
  { timedOut: true },
);

export function registerAuditTools(): void {
  defineTool({
    name: "gl_audit",
      // Claude Code swaps oversized tool results for a file reference; these two
      // tools legitimately return long reports, so raise their inline ceiling.
      _meta: { "anthropic/maxResultSizeChars": 200_000 },
      title: "Audit Project Code",
      description: `Scan source files for code issues across 18 categories, then fetch live best-practice fixes from official docs. Returns file:line locations. Unlike gl_auto_scan (best practices for your dependencies), this audits YOUR OWN source code.

Categories: layout, performance, accessibility, security, react, nextjs, typescript, node, python, vue, svelte, angular, testing, mobile, api, css, seo, i18n - or "all" (default).

For broad questions like "what can be improved" or "find all issues", use categories: ["all"]. For mobile apps (React Native/Expo), use ["mobile", "react", "typescript", "accessibility", "performance", "security"]. For web apps, use ["react", "nextjs", "typescript", "security", "accessibility", "performance", "layout", "css", "seo"].

If doc fetches fail with empty results, the user likely needs to set GETLIB_GITHUB_TOKEN for higher GitHub API rate limits. The audit patterns themselves always run locally - only the fix guidance fetch requires network.`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      const { projectPath, categories, tokens, maxFiles } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_audit", async (ctx) => {
        return withToolTimeout(async () => {
          const { response, resolved } = await auditProjectUseCase(
            {
              ...(projectPath !== undefined ? { projectPath } : {}),
              categories,
              tokens,
              maxFiles,
            },
            liveAuditDeps,
          );
          ctx.resolved = resolved;
          return response;
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
