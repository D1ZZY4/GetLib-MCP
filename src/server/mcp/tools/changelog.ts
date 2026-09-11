import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { noteToolSubject, withTelemetry } from "../services/telemetry";
import { withToolTimeout } from "../utils/guard";
import { timeoutResponse } from "./timeout";
import { nonBlankString } from "../utils/schemas";
import { DEFAULT_TOKEN_LIMIT, MAX_TOKEN_LIMIT } from "../constants";
import { changelogUseCase } from "@/application/library/changelog.service";
import { liveChangelogDeps } from "../infrastructure/deps/changelog-deps";

const InputSchema = z.object({
  libraryId: nonBlankString(200)
    .describe("Library ID from gl_resolve_library, e.g. 'vercel/next.js'"),
  version: z
    .string()
    .max(50)
    .optional()
    .describe("Filter to a specific version prefix, e.g. '15' or 'v15.2.0'"),
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
  "Changelog fetch timed out. Retry, or open the library's GitHub releases page directly.",
  { timedOut: true },
);

export function registerChangelogTools(): void {
  defineTool({
    name: "gl_changelog",
      title: "Fetch Library Changelog",
      description: `Fetch recent release notes and changelog for a library. Reads GitHub Releases API first, then CHANGELOG.md, then the docs site. Use before upgrading.

Use this for "what changed in version X" questions. For "how do I upgrade my code from vA to vB" - use gl_migration instead (it targets MIGRATION.md, UPGRADING.md, and upgrade guides with step-by-step instructions).`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      const { libraryId, version, tokens } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_changelog", async (ctx) => {
        noteToolSubject(ctx, libraryId);
        ctx.resolved = true;
        return withToolTimeout(async () => {
          const { response } = await changelogUseCase(
            {
              libraryId,
              ...(version !== undefined ? { version } : {}),
              tokens,
            },
            liveChangelogDeps,
          );
          return response;
        }, TIMEOUT_RESPONSE);
      });
    }
  });
}

