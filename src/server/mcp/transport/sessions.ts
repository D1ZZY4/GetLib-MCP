/**
 * Shared session-housekeeping for MCP transports.
 *
 * Both Streamable HTTP and SSE keep per-connection sessions in memory.
 * Sessions whose close hook never fired (crashed clients, lost
 * connections) are evicted here so the maps stay bounded without a
 * background timer.
 */

export interface SessionEntryBase {
  lastSeenAt: number;
}

export const SESSION_IDLE_TTL_MS = 30 * 60 * 1000;
export const SESSION_MAX_ENTRIES = 1000;

export function pruneSessionMap<T extends SessionEntryBase>(
  sessions: Map<string, T>,
  now: number = Date.now(),
): void {
  for (const [id, entry] of sessions) {
    if (now - entry.lastSeenAt > SESSION_IDLE_TTL_MS) {
      sessions.delete(id);
    }
  }
  while (sessions.size > SESSION_MAX_ENTRIES) {
    const oldest = sessions.keys().next().value;
    if (oldest === undefined) break;
    sessions.delete(oldest);
  }
}
