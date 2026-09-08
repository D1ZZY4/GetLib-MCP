import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../../config";
import { log } from "../../utils/logger";

/**
 * Server-side Supabase client boundary.
 *
 * All Supabase access must go through getSupabaseClient(). Frontend code
 * must never import this module. Credentials stay server-side; only the
 * anon/publishable key is used from server code, and the service key is
 * reserved for privileged bootstrap operations.
 *
 * Connection strategy for Vercel serverless: the JS client talks to
 * Supabase over HTTPS (PostgREST/Auth), not over a persistent Postgres
 * TCP connection, so there is no per-instance connection pool to leak.
 * Each invocation creates or reuses a lightweight client and never holds
 * open sockets across requests. Transaction pooling (Supavisor) applies
 * on the Supabase side for direct-database workloads.
 */

let cached: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return config.supabaseUrl !== undefined && config.supabaseAnonKey !== undefined;
}

/**
 * Returns a Supabase client when configuration is present, otherwise null.
 * Null means the caller must use the mock repository (development) or
 * report degraded/unavailable status (production without config fails
 * earlier in validateProductionPolicy).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  if (!isSupabaseConfigured()) {
    cached = null;
    return cached;
  }
  try {
    cached = createClient(config.supabaseUrl as string, config.supabaseAnonKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-getlib-client": "server" } },
    });
    return cached;
  } catch (error) {
    log({ level: "warn", msg: "supabase.client.init-failed", error: String(error) });
    cached = null;
    return cached;
  }
}

/** Service-role client for privileged bootstrap writes. Null when unavailable. */
export function getSupabaseServiceClient(): SupabaseClient | null {
  if (config.supabaseUrl === undefined || config.supabaseServiceKey === undefined) return null;
  try {
    return createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return null;
  }
}
