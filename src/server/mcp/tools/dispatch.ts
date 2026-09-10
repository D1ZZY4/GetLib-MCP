/**
 * gl_dispatch - the smart entry point.
 *
 * Most MCP clients will call individual gl_* tools directly because the
 * server.instructions block tells them exactly which tool to use for which
 * trigger phrase. But some clients (or some user inputs) are ambiguous, so
 * `gl_dispatch` is the safety net: take a plain-text user query, route it
 * to the most appropriate underlying tool, and return either:
 *   1. A structured "use this tool with these args" guidance block so the
 *      LLM can immediately make the next tool call (the common, low-latency
 *      path), or
 *   2. An inline executed result for the most common case (gl_auto_scan
 *      with the current cwd, no extra args needed), so a single round-trip
 *      is enough.
 *
 * This is the "never disappoint" tool - even if the user just types
 * "use getlib mcp" with no further context, the dispatch returns *something*
 * useful (typically: scanned project dependencies + best practices).
 */

import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { withToolTimeout } from "../utils/guard";
import { timeoutResponse } from "./timeout";
import { nonBlankString } from "../utils/schemas";
import { withTelemetry } from "../services/telemetry";
import { dispatchUseCase } from "@/application/dispatch/dispatch.service";
import { liveDispatchDeps } from "../infrastructure/deps/dispatch-deps";

const InputSchema = z.object({
  query: nonBlankString(2000)
    .describe(
      "Plain-text user intent. Examples: 'use getlib for react', 'find issues', 'migrate next from 14 to 15', 'best practices for fastapi'.",
    ),
  projectPath: z
    .string()
    .max(500)
    .optional()
    .describe(
      "Optional project directory for project-level intents (auto-scan, audit). Defaults to current working directory.",
    ),
});

const TOOL_DESCRIPTION = `Routes a plain-text user query to the correct gl_* tool with the right arguments. Examples: "use gl", "use getlib for react", "find issues in this codebase", "migrate next from 14 to 15".

WHEN TO USE: the user's intent is ambiguous, they invoked gl without specifying a tool ("use getlib mcp"), or you want a single entry point that always returns something actionable.

WHEN NOT TO USE: you already know which gl_* tool fits. Call it directly to save one round-trip.

OUTPUT: a routing decision with tool name, args, reason, and a 0-to-1 confidence score. The response text also embeds the routing table and a recommended JSON call so you can make the next tool call without another lookup.

Use it for "use getlib mcp" in any phrasing.`;

const TIMEOUT_RESPONSE = timeoutResponse(
  "Dispatch timed out. Retry, or call gl_search directly with your query.",
  { timedOut: true, tool: "gl_search" as const, args: {}, reason: "timeout fallback", confidence: 0 },
);

export function registerDispatchTools(): void {
  defineTool({
    name: "gl_dispatch",
      title: "GetLib Dispatch",
      description: TOOL_DESCRIPTION,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    run: async (rawArgs: unknown) => {
      const { query, projectPath } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_dispatch", async (ctx) => {
        return withToolTimeout(async () => {
          const { response, resolved } = await dispatchUseCase(
            {
              query,
              ...(projectPath !== undefined ? { projectPath } : {}),
            },
            liveDispatchDeps,
          );
          ctx.resolved = resolved;
          return response;
        }, TIMEOUT_RESPONSE);
      });
    }
  });
}

