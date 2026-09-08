export interface McpLogEntry {
  id: number;
  timestamp: string;
  kind: "tool" | "http";
  name: string;
  durationMs: number;
  ok: boolean;
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
  return full;
}

export function listLogs(): McpLogEntry[] {
  return [...entries];
}
