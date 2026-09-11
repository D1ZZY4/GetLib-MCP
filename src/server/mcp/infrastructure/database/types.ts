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
  /** sha256 of the configured password, or null when never recorded. */
  passwordHash: string | null;
}

/**
 * Long-lived API key record. Only the sha256 hash is ever persisted;
 * the plaintext key is shown once at creation and cannot be recovered
 * afterwards. Removal deletes the row; there is no revoked state.
 */
export interface ApiKeyRecord {
  id: number;
  name: string;
  keyHash: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface NewApiKey {
  name: string;
  keyHash: string;
  keyPrefix: string;
}

/** Client authentication basis. Display only - never a security boundary. */
export type ClientAuthType = "anonymous" | "api_key" | "session";

/**
 * Stable MCP client identity row. The id is `<slug>=<uuid>`, minted once
 * per identity (API key or user-agent) and never renamed: renames only
 * change display metadata. Auth decisions always use sessions and API
 * keys; these labels exist for the control plane.
 */
export interface ClientRecord {
  id: string;
  name: string;
  clientVersion: string | null;
  transport: string;
  userAgent: string | null;
  apiKeyId: number | null;
  authType: ClientAuthType;
  firstSeenAt: string;
  lastSeenAt: string;
  requestCount: number;
}

export interface NewClientSighting {
  id: string;
  name: string;
  clientVersion?: string;
  transport: string;
  userAgent?: string;
  apiKeyId?: number;
  authType: ClientAuthType;
}

export interface PersistedLogEntry {
  requestId?: string;
  kind: string;
  name: string;
  durationMs: number;
  ok: boolean;
  /** Canonical library id the call was about, when the tool recorded one. */
  subject?: string | null;
}

/**
 * A log row read back from durable storage, newest first.
 * Carries the storage identity and timestamp the write path does not
 * need, so dashboard reads never depend on process memory.
 */
export interface StoredLogEntry extends PersistedLogEntry {
  id: number;
  timestamp: string;
  /** Null for rows written before the subject column existed. */
  subject?: string | null;
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
   * Single row by exact hash for verification. Uses the key_hash index
   * instead of scanning the table. Never rejects: returns null when
   * unreadable or absent.
   */
  findApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null>;
  /**
   * Persist a new API key hash. Rejects on failure so creation never
   * reports a key that was not stored.
   */
  saveApiKey(record: NewApiKey): Promise<ApiKeyRecord>;
  /** Delete by id. Returns false when the row is missing or unwritable. */
  deleteApiKey(id: number): Promise<boolean>;
  /** Best-effort last-used stamp. Never rejects. */
  touchApiKeyLastUsed(id: number): Promise<void>;
  /**
   * Record a client sighting: insert on first sight, otherwise refresh
   * last-seen metadata and bump the counter. Never rejects: transport
   * observation must not fail requests, so failures only reach the log.
   */
  touchClient(sighting: NewClientSighting): Promise<void>;
  /**
   * Client rows ordered by last sighting, newest first, capped at limit.
   * Never rejects: returns [] when unreadable so callers fall back to
   * live transport snapshots.
   */
  listClients(limit: number): Promise<ClientRecord[]>;
  /**
   * Single client row by stable id. Never rejects: returns null when
   * unreadable or absent.
   */
  getClientById(id: string): Promise<ClientRecord | null>;
}
