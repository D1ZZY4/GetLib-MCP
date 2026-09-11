/**
 * Shared session-housekeeping for stateful MCP transports.
 *
 * SSE keeps per-connection sessions in memory. Streamable HTTP is
 * stateless and keeps only a bounded ring of recently seen clients
 * (see transport/http.ts), so it does not use this helper.
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
): T[] {
  const evicted: T[] = [];
  for (const [id, entry] of sessions) {
    if (now - entry.lastSeenAt > SESSION_IDLE_TTL_MS) {
      sessions.delete(id);
      evicted.push(entry);
    }
  }
  while (sessions.size > SESSION_MAX_ENTRIES) {
    const oldest = sessions.keys().next().value;
    if (oldest === undefined) break;
    const entry = sessions.get(oldest);
    sessions.delete(oldest);
    if (entry !== undefined) evicted.push(entry);
  }
  return evicted;
}
