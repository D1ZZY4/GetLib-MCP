import type { DatabaseMode } from "../../runtime";
import { log } from "../../utils/logger";
import { getSupabaseServiceClient } from "../supabase/client";
import type {
  ApiKeyRecord,
  BootstrapRecord,
  ClientRecord,
  DatabaseRepository,
  DatabaseStatus,
  NewApiKey,
  NewClientSighting,
  PersistedLogEntry,
  StoredLogEntry,
} from "./types";

/**
 * Supabase-backed repository for real development and production modes.
 * Uses the server-side client boundary only, preferring the service-role
 * client because the migration tables enable RLS with no public policies.
 * Missing tables or denials degrade to "degraded" - they never silently
 * return mock data.
 */

interface BootstrapRow {
  id: number;
  account: string;
  credentials_changed: boolean;
  updated_at: string;
  password_hash?: string | null;
}

/** Service-role only. The anon client can never satisfy RLS on these
 * tables (no public policies), so falling back to it only masks a
 * misconfigured service key as silent no-ops. Null means unconfigured. */
function privilegedClient() {
  return getSupabaseServiceClient();
}

/**
 * Unconfigured persistence must be loud, never silent. Production reports
 * at error level so a missing service key cannot masquerade as a working
 * database; development and tests stay quiet because unconfigured is the
 * normal local state there.
 */
function reportUnconfigured(msg: string, mode: DatabaseMode): void {
  log({
    level: mode === "supabase-production" ? "error" : "debug",
    msg,
    detail: "Supabase service client is not configured - persistence is skipped.",
  });
}

function withTimeout<T>(work: PromiseLike<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([work, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

// Bounded bootstrap I/O: startup reads/writes must never hang past this.
// Callers pair it with .abortSignal on the query builder so a timeout also
// frees the socket instead of only winning the race above.
const BOOTSTRAP_TIMEOUT_MS = 5000;

export class SupabaseDatabaseRepository implements DatabaseRepository {
  readonly mode: DatabaseMode;

  constructor(mode: DatabaseMode) {
    this.mode = mode;
  }

  async getStatus(): Promise<DatabaseStatus> {
    const started = Date.now();
    const client = privilegedClient();
    if (!client) {
      return {
        mode: this.mode,
        health: "unavailable",
        configured: false,
        latencyMs: null,
        error: "Supabase is not configured.",
        checkedAt: new Date().toISOString(),
      };
    }
    try {
      const probe = client.from("app_bootstrap").select("id").limit(1);
      await withTimeout(probe, 5000, "Supabase health check timed out.");
      return {
        mode: this.mode,
        health: "healthy",
        configured: true,
        latencyMs: Date.now() - started,
        error: null,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log({ level: "warn", msg: "supabase.health.degraded", error: message });
      return {
        mode: this.mode,
        health: "degraded",
        configured: true,
        latencyMs: Date.now() - started,
        // Fixed string at the boundary: provider internals stay in the
        // redacted server log, never in API payloads.
        error: "Supabase is degraded.",
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async getBootstrap(): Promise<BootstrapRecord | null> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.bootstrap.unconfigured", this.mode);
      return null;
    }
    try {
      // withTimeout's PromiseLike inference resolves the builder to
      // unknown, so the envelope is re-asserted here; the shape checks
      // below still validate every field before use. abortSignal sits
      // before maybeSingle because maybeSingle returns the base builder
      // without it.
      const { data, error } = (await withTimeout(
        client
          .from("app_bootstrap")
          .select("account,credentials_changed,updated_at,password_hash")
          .eq("id", 1)
          .abortSignal(AbortSignal.timeout(BOOTSTRAP_TIMEOUT_MS))
          .maybeSingle(),
        BOOTSTRAP_TIMEOUT_MS,
        "Supabase bootstrap read timed out.",
      )) as { data: unknown; error: { message: string } | null };
      // A provider error (RLS denial, missing table, timeout) is
      // degradation, not absence: log it so a null return is never
      // mistaken for "no bootstrap row". Only a clean empty read stays
      // silent.
      if (error) {
        log({ level: "warn", msg: "supabase.bootstrap.degraded", error: error.message });
        return null;
      }
      if (!data) return null;
      const row = data as Partial<Pick<BootstrapRow, "account" | "credentials_changed" | "updated_at" | "password_hash">>;
      if (typeof row.account !== "string" || typeof row.credentials_changed !== "boolean") {
        return null;
      }
      if (typeof row.updated_at !== "string") return null;
      return {
        account: row.account,
        credentialsChanged: row.credentials_changed,
        updatedAt: row.updated_at,
        passwordHash: typeof row.password_hash === "string" ? row.password_hash : null,
      };
    } catch (error) {
      log({ level: "warn", msg: "supabase.bootstrap.read-failed", error: String(error) });
      return null;
    }
  }

  async saveBootstrap(record: BootstrapRecord): Promise<void> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.bootstrap.unconfigured", this.mode);
      return;
    }
    try {
      // No .abortSignal here: upsert returns the base builder without it,
      // so the race above is the bound (same as getStatus).
      await withTimeout(
        client.from("app_bootstrap").upsert(
          {
            id: 1,
            account: record.account,
            credentials_changed: record.credentialsChanged,
            updated_at: record.updatedAt,
            password_hash: record.passwordHash,
          },
          { onConflict: "id" },
        ),
        BOOTSTRAP_TIMEOUT_MS,
        "Supabase bootstrap write timed out.",
      );
    } catch (error) {
      log({ level: "warn", msg: "supabase.bootstrap.save-failed", error: String(error) });
      throw error;
    }
  }

  async saveLog(entry: PersistedLogEntry): Promise<void> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.logs.unconfigured", this.mode);
      return;
    }
    try {
      const insert = client.from("mcp_logs").insert({
        ...(entry.requestId !== undefined ? { request_id: entry.requestId } : {}),
        kind: entry.kind,
        name: entry.name,
        duration_ms: entry.durationMs,
        ok: entry.ok,
      });
      await withTimeout(insert, 3000, "Supabase log insert timed out.");
    } catch (error) {
      log({ level: "warn", msg: "supabase.logs.save-failed", error: String(error) });
    }
  }

  async countLogs(): Promise<number> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.logs.unconfigured", this.mode);
      return 0;
    }
    try {
      const { count, error } = await withTimeout(
        client.from("mcp_logs").select("id", { count: "exact", head: true }),
        5000,
        "Supabase log count timed out.",
      );
      if (error || typeof count !== "number") return 0;
      return count;
    } catch (error) {
      log({ level: "warn", msg: "supabase.logs.count-failed", error: String(error) });
      return 0;
    }
  }

  async listLogs(limit: number): Promise<StoredLogEntry[]> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.logs.unconfigured", this.mode);
      return [];
    }
    try {
      const query = client
        .from("mcp_logs")
        .select("id,request_id,kind,name,duration_ms,ok,created_at")
        .order("created_at", { ascending: false })
        .limit(Math.max(1, Math.min(200, Math.floor(limit))));
      const { data, error } = await withTimeout(query, 5000, "Supabase log read timed out.");
      if (error || !Array.isArray(data)) return [];
      const entries: StoredLogEntry[] = [];
      for (const row of data) {
        const parsed = parseLogRow(row);
        if (parsed) entries.push(parsed);
      }
      return entries;
    } catch (error) {
      log({ level: "warn", msg: "supabase.logs.read-failed", error: String(error) });
      return [];
    }
  }

  async listApiKeys(): Promise<ApiKeyRecord[]> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.apikeys.unconfigured", this.mode);
      return [];
    }
    try {
      const query = client
        .from("api_keys")
        .select("id,name,key_hash,key_prefix,created_at,last_used_at")
        .order("id", { ascending: false })
        .limit(200);
      const { data, error } = await withTimeout(query, 5000, "Supabase api keys read timed out.");
      if (error || !Array.isArray(data)) return [];
      const records: ApiKeyRecord[] = [];
      for (const row of data) {
        const parsed = parseApiKeyRow(row);
        if (parsed) records.push(parsed);
      }
      return records;
    } catch (error) {
      log({ level: "warn", msg: "supabase.apikeys.read-failed", error: String(error) });
      return [];
    }
  }

  async saveApiKey(record: NewApiKey): Promise<ApiKeyRecord> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.apikeys.unconfigured", this.mode);
      throw new Error("Supabase is not configured.");
    }
    try {
      const insert = client
        .from("api_keys")
        .insert({ name: record.name, key_hash: record.keyHash, key_prefix: record.keyPrefix })
        .select("id,name,key_hash,key_prefix,created_at,last_used_at")
        .abortSignal(AbortSignal.timeout(5000))
        .maybeSingle();
      const { data, error } = (await withTimeout(
        insert,
        5000,
        "Supabase api key write timed out.",
      )) as { data: unknown; error: { message: string } | null };
      if (error || !data) throw new Error("Supabase api key insert failed.");
      const parsed = parseApiKeyRow(data);
      if (!parsed) throw new Error("Supabase api key insert returned an unexpected row.");
      return parsed;
    } catch (error) {
      log({ level: "warn", msg: "supabase.apikeys.save-failed", error: String(error) });
      throw error;
    }
  }

  async deleteApiKey(id: number): Promise<boolean> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.apikeys.unconfigured", this.mode);
      return false;
    }
    try {
      // The returned count distinguishes "deleted now" from "missing"
      // so callers can answer 404 truthfully on every backend (the
      // mock does the same).
      const remove = client
        .from("api_keys")
        .delete()
        .eq("id", id)
        .select("id");
      const { data, error } = (await withTimeout(
        remove,
        5000,
        "Supabase api key delete timed out.",
      )) as { data: Array<{ id: number }> | null; error: { message: string } | null };
      if (error || !data) return false;
      return data.length > 0;
    } catch (error) {
      log({ level: "warn", msg: "supabase.apikeys.delete-failed", error: String(error) });
      return false;
    }
  }

  async findApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.apikeys.unconfigured", this.mode);
      return null;
    }
    try {
      const query = client
        .from("api_keys")
        .select("id,name,key_hash,key_prefix,created_at,last_used_at")
        .eq("key_hash", keyHash)
        .abortSignal(AbortSignal.timeout(5000))
        .maybeSingle();
      const { data, error } = (await withTimeout(
        query,
        5000,
        "Supabase api key lookup timed out.",
      )) as { data: unknown; error: { message: string } | null };
      if (error || !data) return null;
      return parseApiKeyRow(data);
    } catch (error) {
      log({ level: "warn", msg: "supabase.apikeys.find-failed", error: String(error) });
      return null;
    }
  }

  async touchApiKeyLastUsed(id: number): Promise<void> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.apikeys.unconfigured", this.mode);
      return;
    }
    try {
      const update = client
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", id);
      await withTimeout(update, 5000, "Supabase api key touch timed out.");
    } catch (error) {
      log({ level: "warn", msg: "supabase.apikeys.touch-failed", error: String(error) });
    }
  }

  async touchClient(sighting: NewClientSighting): Promise<void> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.clients.unconfigured", this.mode);
      return;
    }
    try {
      // No .abortSignal here: upsert returns the base builder without it,
      // so the race below is the bound (same as saveBootstrap).
      const existing = client.from("mcp_clients").select("request_count").eq("id", sighting.id).maybeSingle();
      const { data } = (await withTimeout(existing, 5000, "Supabase client read timed out.")) as {
        data: { request_count: unknown } | null;
      };
      const count =
        data && typeof data.request_count === "number" ? data.request_count + 1 : 1;
      await withTimeout(
        client.from("mcp_clients").upsert(
          {
            id: sighting.id,
            name: sighting.name,
            client_version: sighting.clientVersion ?? null,
            transport: sighting.transport,
            user_agent: sighting.userAgent ?? null,
            api_key_id: sighting.apiKeyId ?? null,
            auth_type: sighting.authType,
            last_seen_at: new Date().toISOString(),
            request_count: count,
          },
          { onConflict: "id" },
        ),
        5000,
        "Supabase client write timed out.",
      );
    } catch (error) {
      log({ level: "warn", msg: "supabase.clients.touch-failed", error: String(error) });
    }
  }

  async listClients(limit: number): Promise<ClientRecord[]> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.clients.unconfigured", this.mode);
      return [];
    }
    try {
      const query = client
        .from("mcp_clients")
        .select("id,name,client_version,transport,user_agent,api_key_id,auth_type,first_seen_at,last_seen_at,request_count")
        .order("last_seen_at", { ascending: false })
        .limit(Math.max(1, Math.min(200, Math.floor(limit))));
      const { data, error } = await withTimeout(query, 5000, "Supabase clients read timed out.");
      if (error || !Array.isArray(data)) return [];
      const records: ClientRecord[] = [];
      for (const row of data) {
        const parsed = parseClientRow(row);
        if (parsed) records.push(parsed);
      }
      return records;
    } catch (error) {
      log({ level: "warn", msg: "supabase.clients.read-failed", error: String(error) });
      return [];
    }
  }

  async getClientById(id: string): Promise<ClientRecord | null> {
    const client = privilegedClient();
    if (!client) {
      reportUnconfigured("supabase.clients.unconfigured", this.mode);
      return null;
    }
    try {
      const query = client
        .from("mcp_clients")
        .select("id,name,client_version,transport,user_agent,api_key_id,auth_type,first_seen_at,last_seen_at,request_count")
        .eq("id", id)
        .abortSignal(AbortSignal.timeout(5000))
        .maybeSingle();
      const { data, error } = (await withTimeout(
        query,
        5000,
        "Supabase client lookup timed out.",
      )) as { data: unknown; error: { message: string } | null };
      if (error || !data) return null;
      return parseClientRow(data);
    } catch (error) {
      log({ level: "warn", msg: "supabase.clients.find-failed", error: String(error) });
      return null;
    }
  }
}

function parseApiKeyRow(row: unknown): ApiKeyRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const record = row as Record<string, unknown>;
  const { id, name, key_hash, key_prefix, created_at, last_used_at } = record;
  if (typeof id !== "number" || !Number.isFinite(id)) return null;
  if (typeof name !== "string" || typeof key_hash !== "string" || typeof key_prefix !== "string") {
    return null;
  }
  if (typeof created_at !== "string") return null;
  if (last_used_at !== null && last_used_at !== undefined && typeof last_used_at !== "string") {
    return null;
  }
  return {
    id,
    name,
    keyHash: key_hash,
    keyPrefix: key_prefix,
    createdAt: created_at,
    lastUsedAt: typeof last_used_at === "string" ? last_used_at : null,
  };
}

function parseClientRow(row: unknown): ClientRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const record = row as Record<string, unknown>;
  const {
    id,
    name,
    client_version,
    transport,
    user_agent,
    api_key_id,
    auth_type,
    first_seen_at,
    last_seen_at,
    request_count,
  } = record;
  if (typeof id !== "string" || typeof name !== "string") return null;
  if (typeof transport !== "string") return null;
  if (typeof first_seen_at !== "string" || typeof last_seen_at !== "string") return null;
  if (typeof request_count !== "number" || !Number.isFinite(request_count)) return null;
  if (auth_type !== "anonymous" && auth_type !== "api_key" && auth_type !== "session") return null;
  return {
    id,
    name,
    clientVersion: typeof client_version === "string" ? client_version : null,
    transport,
    userAgent: typeof user_agent === "string" ? user_agent : null,
    apiKeyId: typeof api_key_id === "number" ? api_key_id : null,
    authType: auth_type,
    firstSeenAt: first_seen_at,
    lastSeenAt: last_seen_at,
    requestCount: request_count,
  };
}

function parseLogRow(row: unknown): StoredLogEntry | null {  if (typeof row !== "object" || row === null) return null;
  const record = row as Record<string, unknown>;
  const { id, request_id, kind, name, duration_ms, ok, created_at } = record;
  if (typeof id !== "number" || !Number.isFinite(id)) return null;
  if (typeof name !== "string" || typeof created_at !== "string") return null;
  if (typeof duration_ms !== "number" || typeof ok !== "boolean") return null;
  return {
    id,
    timestamp: created_at,
    ...(typeof request_id === "string" ? { requestId: request_id } : {}),
    kind: typeof kind === "string" ? kind : "tool",
    name,
    durationMs: duration_ms,
    ok,
  };
}
