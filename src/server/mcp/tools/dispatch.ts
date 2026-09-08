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
import { detectIntent, renderRoutingTable } from "../services/intent-router";
import { withNotice, safeguardPath, withToolTimeout } from "../utils/guard";
import { withTelemetry } from "../services/telemetry";
import { ROUTING_RATIONALE, ROUTING_FALLBACK } from "../sources/routing-rationale";

const InputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(2000)
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

const TIMEOUT_RESPONSE = {
  content: [{ type: "text" as const, text: "Dispatch timed out. Retry, or call gl_search directly with your query." }],
  structuredContent: { timedOut: true, tool: "gl_search" as const, args: {}, reason: "timeout fallback", confidence: 0 },
};

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
        const intent = detectIntent({
          query,
          ...(projectPath !== undefined ? { projectPath } : {}),
        });

        // Resolve project path for project-level tools
        let resolvedPath: string | undefined;
        if (
          intent.tool === "gl_auto_scan" ||
          intent.tool === "gl_audit"
        ) {
          try {
            const rawPath = intent.args["projectPath"];
            const pathArg = typeof rawPath === "string" ? rawPath : undefined;
            resolvedPath = safeguardPath(pathArg ?? projectPath ?? process.cwd());
            intent.args["projectPath"] = resolvedPath;
          } catch {
            // fall back to bare cwd marker - actual tool will re-validate
          }
        }

        const lines: string[] = [];
        lines.push(`# Dispatch - routed to \`${intent.tool}\``);
        lines.push("");
        lines.push(`> Confidence: **${(intent.confidence * 100).toFixed(0)}%**  •  Reason: ${intent.reason}`);
        lines.push("");
        lines.push("## Recommended call");
        lines.push("```json");
        lines.push(
          JSON.stringify(
            {
              tool: intent.tool,
              args: intent.args,
            },
            null,
            2,
          ),
        );
        lines.push("```");
        lines.push("");
        lines.push("## Why this routing?");

        lines.push(ROUTING_RATIONALE[intent.tool] ?? ROUTING_FALLBACK);
        lines.push("");
        lines.push("## Next step");
        lines.push(
          `Invoke the recommended tool with the args above. The arguments are checked against the target tool's required fields. If the routing looks wrong, fall back to \`gl_search({ query: "${query.replace(/"/g, '\\"')}" })\` - it never fails to return *something* useful.`,
        );
        lines.push("");
        lines.push("---");
        lines.push("");
        lines.push(renderRoutingTable());

        ctx.resolved = true;
        return {
          content: [{ type: "text", text: withNotice(lines.join("\n")) }],
          structuredContent: {
            tool: intent.tool,
            args: intent.args,
            reason: intent.reason,
            confidence: intent.confidence,
          },
        };
        }, TIMEOUT_RESPONSE);
      });
    }
  });
}

