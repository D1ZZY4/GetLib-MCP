import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { withToolTimeout } from "../utils/guard";
import { timeoutResponse } from "./timeout";
import { nonBlankString } from "../utils/schemas";
import { DEFAULT_TOKEN_LIMIT, MAX_TOKEN_LIMIT } from "../constants";
import { withTelemetry } from "../services/telemetry";
import { migrationUseCase } from "@/application/library/migration.service";
import { liveMigrationDeps } from "../infrastructure/deps/migration-deps";

const InputSchema = z.object({
  libraryId: nonBlankString(300)
    .describe("Library ID from gl_resolve_library (e.g. 'vercel/next.js')"),
  fromVersion: z
    .string()
    .max(50)
    .optional()
    .describe("Version migrating from, e.g. '14', 'v3.0'"),
  toVersion: z
    .string()
    .max(50)
    .optional()
    .describe("Version migrating to, e.g. '15', 'v4.0'"),
  tokens: z
    .number()
    .int()
    .min(1000)
    .max(MAX_TOKEN_LIMIT)
    .default(DEFAULT_TOKEN_LIMIT)
    .describe("Max tokens to return"),
});

/** Returned when the whole pipeline exceeds the tool timeout - an actionable
 *  next step beats a hung call or an MCP-level timeout error. */
const TIMEOUT_RESPONSE = timeoutResponse(
  "Migration lookup timed out. Retry with explicit fromVersion/toVersion, or call gl_changelog instead.",
);

export function registerMigrationTools(): void {
  defineTool({
    name: "gl_migration",
      title: "Get Migration Guide",
      description: `Fetch migration guides, breaking changes, and upgrade instructions for a library. Targets MIGRATION.md, UPGRADING.md, CHANGELOG, release notes, and upgrade docs.

Call gl_resolve_library first to get the libraryId.

Use this when the user asks HOW to upgrade their code from one version to another (step-by-step migration instructions, breaking changes, code transforms needed). For "what changed in version X" release notes without upgrade instructions, use gl_changelog instead.`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      const { libraryId, fromVersion, toVersion, tokens } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_migration", async (ctx) => {
        ctx.resolved = true;
        return withToolTimeout(async () => {
          const { response } = await migrationUseCase(
            {
              libraryId,
              ...(fromVersion !== undefined ? { fromVersion } : {}),
              ...(toVersion !== undefined ? { toVersion } : {}),
              tokens,
            },
            liveMigrationDeps,
          );
          return response;
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
