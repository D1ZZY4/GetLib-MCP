import { SERVER_NAME, SERVER_VERSION } from "@/server/mcp/constants";
import { listLogs } from "@/server/mcp/middleware/logging";
import { listPrompts } from "@/server/mcp/registry/prompt-registry";
import { ensureRegistryLoaded } from "@/server/mcp/registry/registry-loader";
import { listResources } from "@/server/mcp/registry/resource-registry";
import { getTool, listTools, runTool } from "@/server/mcp/registry/tool-registry";
import type { GlToolAnnotations } from "@/server/mcp/registry/tool-registry";
import { transportModeIds, type TransportModeId } from "@/domain/mcp/catalog";

export interface McpToolInputKey {
  key: string;
  description: string | null;
}

export interface McpCatalogToolEntry {
  name: string;
  description: string;
  inputKeys: McpToolInputKey[];
  annotations?: GlToolAnnotations;
}

export interface McpCatalogSnapshot {
  tools: McpCatalogToolEntry[];
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

function describeInputKey(schema: unknown): string | null {
  if (typeof schema !== "object" || schema === null) return null;
  const description = (schema as { description?: unknown }).description;
  return typeof description === "string" && description.length > 0 ? description : null;
}

function inputKeysOf(inputSchema: Record<string, object> | undefined): McpToolInputKey[] {
  if (!inputSchema) return [];
  return Object.entries(inputSchema).map(([key, schema]) => ({
    key,
    description: describeInputKey(schema),
  }));
}

export function getMcpCatalog(): McpCatalogSnapshot {
  ensureLoaded();
  return {
    tools: listTools().map(({ name, description }) => {
      const def = getTool(name);
      return {
        name,
        description,
        inputKeys: inputKeysOf(def?.inputSchema),
        ...(def?.annotations ? { annotations: def.annotations } : {}),
      };
    }),
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

export interface ToolExecution {
  tool: string;
  result: unknown;
  requestId: string;
  durationMs: number;
}

export async function executeTool(
  name: string,
  args: unknown,
  requestId?: string,
): Promise<ToolExecution> {
  validateToolName(name);
  const started = Date.now();
  const result = await runTool(name, args, requestId);
  return { tool: name, result, requestId: requestId ?? "", durationMs: Date.now() - started };
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
