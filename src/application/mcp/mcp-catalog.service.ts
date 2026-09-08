import { SERVER_NAME, SERVER_VERSION } from "@/server/mcp/constants";
import { listLogs } from "@/server/mcp/middleware/logging";
import { listPrompts } from "@/server/mcp/registry/prompt-registry";
import { ensureRegistryLoaded } from "@/server/mcp/registry/registry-loader";
import { listResources } from "@/server/mcp/registry/resource-registry";
import { getTool, listTools, runTool } from "@/server/mcp/registry/tool-registry";
import { transportModeIds, type TransportModeId } from "@/server/mcp/transport/modes";

export interface McpCatalogSnapshot {
  tools: Array<{ name: string; description: string }>;
  resources: Array<{ name: string; uri: string; description: string }>;
  prompts: Array<{ name: string; description: string }>;
}

export interface McpServerDescriptor {
  id: string;
  name: string;
  version: string;
  transports: TransportModeId[];
  status: "online";
  counts: { tools: number; resources: number; prompts: number };
}

export interface McpServersSnapshot {
  servers: McpServerDescriptor[];
}

const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

function ensureLoaded(): void {
  ensureRegistryLoaded();
}

export function getMcpCatalog(): McpCatalogSnapshot {
  ensureLoaded();
  return {
    tools: listTools(),
    resources: listResources(),
    prompts: listPrompts(),
  };
}

export function getMcpServers(): McpServersSnapshot {
  const catalog = getMcpCatalog();
  return {
    servers: [
      {
        id: "getlib-local",
        name: SERVER_NAME,
        version: SERVER_VERSION,
        transports: transportModeIds(),
        status: "online",
        counts: {
          tools: catalog.tools.length,
          resources: catalog.resources.length,
          prompts: catalog.prompts.length,
        },
      },
    ],
  };
}

export function isKnownTool(name: string): boolean {
  ensureLoaded();
  return getTool(name) !== undefined;
}

export function validateToolName(name: string): void {
  if (!TOOL_NAME_PATTERN.test(name)) {
    throw new ToolNameValidationError(`Invalid tool name: "${name}"`);
  }
  if (!isKnownTool(name)) {
    throw new UnknownToolError(name);
  }
}

export class UnknownToolError extends Error {
  readonly tool: string;
  constructor(tool: string) {
    super(`Unknown tool: ${tool}`);
    this.name = "UnknownToolError";
    this.tool = tool;
  }
}

export class ToolNameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolNameValidationError";
  }
}

export async function executeTool(name: string, args: unknown): Promise<{ tool: string; result: unknown }> {
  validateToolName(name);
  const result = await runTool(name, args);
  return { tool: name, result };
}

const DEFAULT_LOG_LIMIT = 50;
const MAX_LOG_LIMIT = 100;

export function parseLogLimit(raw: string | null): number {
  if (raw === null || raw.length === 0) return DEFAULT_LOG_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new ToolNameValidationError(`Invalid limit: "${raw}" - must be an integer between 1 and ${MAX_LOG_LIMIT}`);
  }
  return Math.min(parsed, MAX_LOG_LIMIT);
}

export function listMcpLogs(limit: number = DEFAULT_LOG_LIMIT): { logs: ReturnType<typeof listLogs>; total: number } {
  const logs = listLogs();
  return { logs: logs.slice(0, limit), total: logs.length };
}
