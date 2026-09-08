import { log } from "../utils/logger";

export interface McpLogEntry {
  id: number;
  timestamp: string;
  kind: "tool" | "http";
  name: string;
  durationMs: number;
  ok: boolean;
  requestId?: string;
}

const MAX_ENTRIES = 100;
let counter = 0;
const entries: McpLogEntry[] = [];

export function appendLog(entry: Omit<McpLogEntry, "id" | "timestamp">): McpLogEntry {
  counter += 1;
  const full: McpLogEntry = {
    ...entry,
    id: counter,
    timestamp: new Date().toISOString(),
  };
  entries.unshift(full);
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }
  // Mirror into the centralized structured logger so tool runs are
  // observable in one pipeline (stderr/json) instead of memory only.
  // No arguments, headers, or tokens are logged - names and timings only.
  log({
    level: full.ok ? "info" : "warn",
    msg: full.ok ? "mcp.tool.ok" : "mcp.tool.error",
    tool: full.name,
    durationMs: full.durationMs,
    ...(full.requestId !== undefined ? { requestId: full.requestId } : {}),
  });
  return full;
}

export function listLogs(): McpLogEntry[] {
  return [...entries];
}
