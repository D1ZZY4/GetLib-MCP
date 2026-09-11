/**
 * Last-write-failure tracker for durable persistence.
 *
 * Best-effort writers (client sightings, log mirroring) must never fail
 * requests, so they swallow errors by design. Without this tracker a
 * broken sink looks identical to an idle one from the outside: empty
 * tables, healthy probes, no trace. Every swallowed write failure lands
 * here and rides along on the database status, so the dashboard and
 * health endpoints show the real error instead of "healthy, no data".
 */

export interface PersistenceWriteHealth {
  failedWrites: number;
  lastSink: string | null;
  lastErrorAt: string | null;
  /** Sanitized provider message, capped. Never carries secrets. */
  lastError: string | null;
}

const MAX_ERROR_LENGTH = 300;

const state: PersistenceWriteHealth = {
  failedWrites: 0,
  lastSink: null,
  lastErrorAt: null,
  lastError: null,
};

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

/** Record one swallowed persistence write failure. Never throws. */
export function recordPersistenceFailure(sink: string, error: unknown): void {
  try {
    state.failedWrites += 1;
    state.lastSink = sink;
    state.lastErrorAt = new Date().toISOString();
    state.lastError = sanitizeError(error);
  } catch {
    // The tracker itself must never break a write path.
  }
}

/** Snapshot for status payloads. Callers get a copy, never the live row. */
export function getPersistenceWriteHealth(): PersistenceWriteHealth {
  return { ...state };
}

/** Test isolation only. Production code never calls this. */
export function resetPersistenceWriteHealth(): void {
  state.failedWrites = 0;
  state.lastSink = null;
  state.lastErrorAt = null;
  state.lastError = null;
}
