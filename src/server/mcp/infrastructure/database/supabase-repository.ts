import type { DatabaseMode } from "../../runtime";
import { log } from "../../utils/logger";
import { getSupabaseServiceClient } from "../supabase/client";
import type {
  BootstrapRecord,
  DatabaseRepository,
  DatabaseStatus,
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
          .select("account,credentials_changed,updated_at")
          .eq("id", 1)
          .abortSignal(AbortSignal.timeout(BOOTSTRAP_TIMEOUT_MS))
          .maybeSingle(),
        BOOTSTRAP_TIMEOUT_MS,
        "Supabase bootstrap read timed out.",
      )) as { data: unknown; error: { message: string } | null };
      if (error || !data) return null;
      const row = data as Partial<Pick<BootstrapRow, "account" | "credentials_changed" | "updated_at">>;
      if (typeof row.account !== "string" || typeof row.credentials_changed !== "boolean") {
        return null;
      }
      if (typeof row.updated_at !== "string") return null;
      return {
        account: row.account,
        credentialsChanged: row.credentials_changed,
        updatedAt: row.updated_at,
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

  async listLogs(limit: number): Promise<StoredLogEntry[]> {    const client = privilegedClient();
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
}

function parseLogRow(row: unknown): StoredLogEntry | null {
  if (typeof row !== "object" || row === null) return null;
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
