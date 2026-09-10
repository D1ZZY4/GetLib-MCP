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

/**
 * Long-lived API key record. Only the sha256 hash is ever persisted;
 * the plaintext key is shown once at creation and cannot be recovered
 * afterwards. Revocation flips the flag; rows are kept for auditability.
 */
export interface ApiKeyRecord {
  id: number;
  name: string;
  keyHash: string;
  keyPrefix: string;
  revoked: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface NewApiKey {
  name: string;
  keyHash: string;
  keyPrefix: string;
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
   * Exact total of persisted log rows, for counters that must not be
   * windowed by listLogs. Never rejects: returns 0 when unreadable so
   * statistics fall back to in-memory telemetry instead of breaking.
   */
  countLogs(): Promise<number>;
  /**
   * Durable observability read, newest first, capped at limit. This is
   * the authoritative read path for production: the dashboard must show
   * persisted logs, not whatever survives in this process's memory.
   */
  listLogs(limit: number): Promise<StoredLogEntry[]>;
  /** All API key rows, newest first. Never rejects: returns [] when unreadable. */
  listApiKeys(): Promise<ApiKeyRecord[]>;
  /**
   * Persist a new API key hash. Rejects on failure so creation never
   * reports a key that was not stored.
   */
  saveApiKey(record: NewApiKey): Promise<ApiKeyRecord>;
  /** Revoke by id. Returns false when the row is missing or unwritable. */
  revokeApiKey(id: number): Promise<boolean>;
  /** Best-effort last-used stamp. Never rejects. */
  touchApiKeyLastUsed(id: number): Promise<void>;
}
