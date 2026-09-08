export interface McpToolEntry {
  name: string;
  description: string;
}

export interface McpResourceEntry {
  name: string;
  uri: string;
  description: string;
}

export interface McpPromptEntry {
  name: string;
  description: string;
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
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`MCP API error: HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export function fetchCatalog(): Promise<McpCatalog> {
  return fetch("/api/mcp").then((response) => parseJson<McpCatalog>(response));
}

export function fetchServers(): Promise<{ servers: McpServerEntry[] }> {
  return fetch("/api/mcp/servers").then((response) =>
    parseJson<{ servers: McpServerEntry[] }>(response),
  );
}

export function fetchLogs(): Promise<{ logs: McpLogEntry[] }> {
  return fetch("/api/mcp/logs").then((response) => parseJson<{ logs: McpLogEntry[] }>(response));
}

export function runTool(name: string): Promise<unknown> {
  return fetch(`/api/mcp/${name}`, { method: "POST" }).then((response) =>
    parseJson<unknown>(response),
  );
}
