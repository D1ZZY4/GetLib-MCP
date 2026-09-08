import { getDatabase } from "../infrastructure/database";
import { resolveDatabaseMode } from "../runtime";
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
  // Durable sink for production only: development and tests stay on the
  // in-memory ring (plus the mock repository when addressed directly), so
  // the hot tool path never pays for network I/O outside production.
  // saveLog never rejects, keeping this fire-and-forget safe.
  if (resolveDatabaseMode() === "supabase-production") {
    void getDatabase().saveLog({
      ...(full.requestId !== undefined ? { requestId: full.requestId } : {}),
      kind: full.kind,
      name: full.name,
      durationMs: full.durationMs,
      ok: full.ok,
    });
  }
  return full;
}

export function listLogs(): McpLogEntry[] {
  return [...entries];
}
