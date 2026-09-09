import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../../config";

/**
 * Server-side Supabase client boundary.
 *
 * All Supabase access goes through the database repository boundary
 * (infrastructure/database), which uses the service-role client below for
 * privileged server-side operations. Frontend code must never import this
 * module. Credentials stay server-side.
 *
 * Connection strategy for Vercel serverless: the JS client talks to
 * Supabase over HTTPS (PostgREST/Auth), not over a persistent Postgres
 * TCP connection, so there is no per-instance connection pool to leak.
 * Each invocation creates or reuses a lightweight client and never holds
 * open sockets across requests. Transaction pooling (Supavisor) applies
 * on the Supabase side for direct-database workloads.
 */

export function isSupabaseConfigured(): boolean {
  return config.supabaseUrl !== undefined && config.supabaseAnonKey !== undefined;
}

/** Service-role client for privileged server-side operations. Null when unavailable. */
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
