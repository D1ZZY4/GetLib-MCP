import { safeguardPath, withNotice } from "@/server/mcp/utils/guard";
import { log } from "@/server/mcp/utils/logger";
import type { GlToolName, IntentInput, IntentMatch } from "@/server/mcp/services/intent/types";

/**
 * Capability seams of the dispatch use case. Intent detection, routing
 * table rendering, and the routing rationale copy are infrastructure
 * details injected here. Shared protection/presentation
 * (safeguardPath, withNotice) stays imported as cross-cutting technical
 * infrastructure.
 */
export interface DispatchDeps {
  detectIntent: (input: IntentInput) => IntentMatch;
  renderRoutingTable: () => string;
  routingRationale: Partial<Record<GlToolName, string>>;
  routingFallback: string;
}

export interface DispatchInput {
  query: string;
  projectPath?: string;
}

export interface DispatchApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent: {
      tool: GlToolName;
      args: Record<string, unknown>;
      reason: string;
      confidence: number;
    };
  };
  resolved: boolean;
}

/**
 * Intent-dispatch use case shared by the MCP dispatch tool and any
 * future consumer. Owns the routing decision, project-path resolution
 * for project-level tools, and the guidance-block render. Transport
 * adapters only validate input, inject the live infrastructure
 * adapters, and map this result.
 */
export async function dispatchUseCase(input: DispatchInput, deps: DispatchDeps): Promise<DispatchApplicationResult> {
  const projectPath = input.projectPath === undefined || input.projectPath.trim().length === 0
    ? undefined
    : input.projectPath;
  const intent = deps.detectIntent({
    query: input.query,
    ...(projectPath !== undefined ? { projectPath } : {}),
  });

  // Resolve project path for project-level tools
  if (intent.tool === "gl_auto_scan" || intent.tool === "gl_audit") {
    try {
      const rawPath = intent.args["projectPath"];
      const pathArg = typeof rawPath === "string" ? rawPath : undefined;
      const resolvedPath = safeguardPath(pathArg ?? projectPath ?? process.cwd());
      intent.args["projectPath"] = resolvedPath;
    } catch (error) {
      // Fall back to the raw arg - the actual tool re-validates it.
      log({ level: "debug", msg: "dispatch.project-path.unresolved", error: error instanceof Error ? error.message : String(error) });
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

  lines.push(deps.routingRationale[intent.tool] ?? deps.routingFallback);
  lines.push("");
  lines.push("## Next step");
  lines.push(
    `Invoke the recommended tool with the args above. The arguments are checked against the target tool's required fields. If the routing looks wrong, fall back to \`gl_search({ query: "${input.query.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}" })\` - it never fails to return *something* useful.`,
  );
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(deps.renderRoutingTable());

  return {
    response: {
      content: [{ type: "text", text: withNotice(lines.join("\n")) }],
      structuredContent: {
        tool: intent.tool,
        args: intent.args,
        reason: intent.reason,
        confidence: intent.confidence,
      },
    },
    resolved: true,
  };
}
