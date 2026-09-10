import { SERVER_NAME, SERVER_VERSION } from "@/server/mcp/constants";
import type { DatabaseRepository, StoredLogEntry } from "@/server/mcp/infrastructure/database";
import type { McpLogEntry } from "@/server/mcp/middleware/logging";
import type { GlToolAnnotations, GlToolDef } from "@/server/mcp/registry/tool-registry";
import { resolveDatabaseMode } from "@/server/mcp/runtime";
import { transportModeIds, type TransportModeId } from "@/domain/mcp/catalog";
import {
  LOG_LIMIT_DEFAULT,
  TOOL_NAME_PATTERN,
  parseLogLimitValue,
} from "@/server/mcp/utils/schemas";
import { log } from "@/server/mcp/utils/logger";
import { generateRequestId } from "@/server/mcp/utils/guard";

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

/**
 * Capability seams of the MCP catalog. Registry reads, tool execution,
 * durable log reads, and the in-memory log ring are infrastructure
 * injected here; pure shaping (input keys, view mapping, limit parsing)
 * and shared policy (database mode, schemas, logging) stay directly
 * owned.
 */
export interface McpCatalogDeps {
  ensureRegistryLoaded: () => void;
  listTools: () => Array<Pick<GlToolDef, "name" | "description">>;
  getTool: (name: string) => GlToolDef | undefined;
  listResources: () => Array<{ name: string; uri: string; description: string }>;
  listPrompts: () => Array<{ name: string; description: string }>;
  runTool: (name: string, args?: unknown, requestId?: string) => Promise<unknown>;
  getDatabase: () => Pick<DatabaseRepository, "countLogs" | "listLogs">;
  listLogs: () => McpLogEntry[];
}

function ensureLoaded(deps: McpCatalogDeps): void {
  deps.ensureRegistryLoaded();
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

export function getMcpCatalog(deps: McpCatalogDeps): McpCatalogSnapshot {
  ensureLoaded(deps);
  return {
    tools: deps.listTools().map(({ name, description }) => {
      const def = deps.getTool(name);
      return {
        name,
        description,
        inputKeys: inputKeysOf(def?.inputSchema),
        ...(def?.annotations ? { annotations: def.annotations } : {}),
      };
    }),
    resources: deps.listResources(),
    prompts: deps.listPrompts(),
  };
}

export function getMcpServers(deps: McpCatalogDeps): McpServersSnapshot {
  const catalog = getMcpCatalog(deps);
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

function isKnownTool(deps: McpCatalogDeps, name: string): boolean {
  ensureLoaded(deps);
  return deps.getTool(name) !== undefined;
}

export function validateToolName(deps: McpCatalogDeps, name: string): void {
  if (!TOOL_NAME_PATTERN.test(name)) {
    throw new ToolNameValidationError(`Invalid tool name: "${name}"`);
  }
  if (!isKnownTool(deps, name)) {
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

export class LogLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogLimitError";
  }
}

export interface ToolExecution {
  tool: string;
  result: unknown;
  requestId: string;
  durationMs: number;
}

export async function executeTool(
  deps: McpCatalogDeps,
  name: string,
  args: unknown,
  requestId?: string,
): Promise<ToolExecution> {
  validateToolName(deps, name);
  const started = Date.now();
  const result = await deps.runTool(name, args, requestId);
  // Never emit an empty correlation id: callers that omit one still get
  // a traceable execution.
  return { tool: name, result, requestId: requestId ?? generateRequestId(), durationMs: Date.now() - started };
}

const DEFAULT_LOG_LIMIT = LOG_LIMIT_DEFAULT;

export function parseLogLimit(raw: string | null): number {
  try {
    return parseLogLimitValue(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new LogLimitError(message);
  }
}

export interface McpLogView {
  logs: McpLogEntry[];
  total: number;
}

function ringLogs(deps: McpCatalogDeps, limit: number): McpLogView {
  const logs = deps.listLogs();
  return { logs: logs.slice(0, limit), total: logs.length };
}

/**
 * Maps one durable log row to the dashboard log view. Pure so the
 * production log read path is unit-testable without a database.
 */
export function mapStoredLogToView(entry: StoredLogEntry): McpLogEntry {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    kind: entry.kind === "http" ? ("http" as const) : ("tool" as const),
    name: entry.name,
    durationMs: entry.durationMs,
    ok: entry.ok,
    ...(entry.requestId !== undefined ? { requestId: entry.requestId } : {}),
  };
}

/**
 * Log read path for the dashboard. Production reads durable storage so
 * the page shows every persisted run, not whatever survives in this
 * process's memory ring (serverless isolates reset constantly). A
 * failed durable read falls back to the ring rather than breaking the
 * page. Development and tests stay on the ring, which is their only
 * source.
 */
export async function listMcpLogs(deps: McpCatalogDeps, limit: number = DEFAULT_LOG_LIMIT): Promise<McpLogView> {
  if (resolveDatabaseMode() === "mock") {
    return ringLogs(deps, limit);
  }
  try {
    const [stored, total] = await Promise.all([
      deps.getDatabase().listLogs(limit),
      deps.getDatabase().countLogs(),
    ]);
    return {
      logs: stored.map(mapStoredLogToView),
      total,
    };
  } catch (error) {
    log({
      level: "warn",
      msg: "mcp-catalog.logs.durable_read_failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return ringLogs(deps, limit);
  }
}
