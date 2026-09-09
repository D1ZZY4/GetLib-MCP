import { fetchJson, postJson } from "@/web/lib/api-client";

export interface McpToolInputKey {
  key: string;
  description: string | null;
}

export interface McpToolEntry {
  name: string;
  description: string;
  inputKeys: McpToolInputKey[];
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
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
  return fetchJson<McpCatalog>("/api/management/tools").then(async (tools) => {
    const [resources, prompts] = await Promise.all([
      fetchJson<{ resources: McpResourceEntry[] }>("/api/management/resources"),
      fetchJson<{ prompts: McpPromptEntry[] }>("/api/management/prompts"),
    ]);
    return { tools: tools.tools, resources: resources.resources, prompts: prompts.prompts };
  });
}

export function fetchServers(): Promise<{ servers: McpServerEntry[] }> {
  return fetchJson<{ servers: McpServerEntry[] }>("/api/management/servers");
}

export function fetchLogs(limit = 100): Promise<{ logs: McpLogEntry[] }> {
  return fetchJson<{ logs: McpLogEntry[] }>(`/api/management/logs?limit=${limit}`);
}

export interface ToolRunResult {
  tool: string;
  result: unknown;
  requestId: string;
  durationMs: number;
}

/**
 * Single tool-execution contract for the dashboard: one endpoint shape
 * for the playground and the tool list. The server measures duration and
 * returns its own request id for log correlation.
 */
export function runTool(name: string, args: Record<string, unknown> = {}): Promise<ToolRunResult> {
  return postJson<ToolRunResult>("/api/management/tools/run", { tool: name, args });
}
