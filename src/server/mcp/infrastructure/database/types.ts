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

export interface DatabaseRepository {
  readonly mode: DatabaseMode;
  getStatus(): Promise<DatabaseStatus>;
  getBootstrap(): Promise<BootstrapRecord | null>;
  saveBootstrap(record: BootstrapRecord): Promise<void>;
  /**
   * Durable observability write. Never rejects: failures are observed
   * through the logger and the in-memory ring stays authoritative for
   * reads, so a broken sink can never break tool execution.
   */
  saveLog(entry: PersistedLogEntry): Promise<void>;
}
