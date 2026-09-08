import { fetchJson, postJson } from "@/web/lib/api-client";

export interface McpToolEntry {
  name: string;
  description: string;
}

export interface McpResourceEntry {
  name: string;
  uri: string;
  description: string;
}

export interface McpPromptArg {
  name: string;
  description: string;
  required: boolean;
}

export interface McpPromptEntry {
  name: string;
  description: string;
  args?: McpPromptArg[];
}

export interface McpCatalog {
  tools: McpToolEntry[];
  resources: McpResourceEntry[];
  prompts: McpPromptEntry[];
}

export interface McpServerEntry {
  id: string;
  name: string;
  version: string;
  transports: string[];
  status: string;
  counts: { tools: number; resources: number; prompts: number };
}

export interface McpLogEntry {
  id: number;
  timestamp: string;
  kind: string;
  name: string;
  durationMs: number;
  ok: boolean;
  requestId?: string;
}

export function fetchCatalog(): Promise<McpCatalog> {
  return fetchJson<McpCatalog>("/api/mcp");
}

export function fetchServers(): Promise<{ servers: McpServerEntry[] }> {
  return fetchJson<{ servers: McpServerEntry[] }>("/api/mcp/servers");
}

export function fetchLogs(): Promise<{ logs: McpLogEntry[] }> {
  return fetchJson<{ logs: McpLogEntry[] }>("/api/mcp/logs?limit=100");
}

/**
 * Single tool-execution contract for the dashboard: POST the args object as
 * JSON. Callers with no args pass {} instead of relying on a separate
 * bodyless overload, so the playground and the tool list hit one endpoint
 * shape.
 */
export function runTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  return postJson<unknown>(`/api/mcp/${name}`, args);
}
