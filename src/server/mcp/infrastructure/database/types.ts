import type { DatabaseMode } from "../../runtime";

/**
 * Database ownership boundary.
 *
 * Application code depends on DatabaseRepository, never on Supabase or
 * the filesystem directly. Infrastructure provides mock (development)
 * and Supabase (real) implementations behind getDatabase().
 */

export type DatabaseHealth = "healthy" | "degraded" | "unavailable" | "mock";

export interface DatabaseStatus {
  mode: DatabaseMode;
  health: DatabaseHealth;
  configured: boolean;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
}

export interface BootstrapRecord {
  account: string;
  credentialsChanged: boolean;
  updatedAt: string;
}

export interface PersistedLogEntry {
  requestId?: string;
  kind: string;
  name: string;
  durationMs: number;
  ok: boolean;
}

/**
 * A log row read back from durable storage, newest first.
 * Carries the storage identity and timestamp the write path does not
 * need, so dashboard reads never depend on process memory.
 */
export interface StoredLogEntry extends PersistedLogEntry {
  id: number;
  timestamp: string;
}

export interface DatabaseRepository {
  readonly mode: DatabaseMode;
  getStatus(): Promise<DatabaseStatus>;
  getBootstrap(): Promise<BootstrapRecord | null>;
  saveBootstrap(record: BootstrapRecord): Promise<void>;
  /**
   * Durable observability write. Never rejects: failures are observed
   * through the logger, so a broken sink can never break tool execution.
   */
  saveLog(entry: PersistedLogEntry): Promise<void>;
  /**
   * Durable observability read, newest first, capped at limit. This is
   * the authoritative read path for production: the dashboard must show
   * persisted logs, not whatever survives in this process's memory.
   */
  listLogs(limit: number): Promise<StoredLogEntry[]>;
}
