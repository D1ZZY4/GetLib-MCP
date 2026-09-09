import type { DatabaseMode } from "../../runtime";
import { log } from "../../utils/logger";
import { getSupabaseServiceClient } from "../supabase/client";
import type {
  BootstrapRecord,
  DatabaseRepository,
  DatabaseStatus,
  PersistedLogEntry,
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

function withTimeout<T>(work: PromiseLike<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([work, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

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
    if (!client) return null;
    try {
      const { data, error } = await client
        .from("app_bootstrap")
        .select("account,credentials_changed,updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (error || !data) return null;
      const row = data as Pick<BootstrapRow, "account" | "credentials_changed" | "updated_at">;
      return {
        account: row.account,
        credentialsChanged: row.credentials_changed,
        updatedAt: row.updated_at,
      };
    } catch {
      return null;
    }
  }

  async saveBootstrap(record: BootstrapRecord): Promise<void> {
    const client = privilegedClient();
    if (!client) return;
    try {
      await client.from("app_bootstrap").upsert(
        {
          id: 1,
          account: record.account,
          credentials_changed: record.credentialsChanged,
          updated_at: record.updatedAt,
        },
        { onConflict: "id" },
      );
    } catch (error) {
      log({ level: "warn", msg: "supabase.bootstrap.save-failed", error: String(error) });
    }
  }

  async saveLog(entry: PersistedLogEntry): Promise<void> {
    const client = privilegedClient();
    if (!client) return;
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
}
