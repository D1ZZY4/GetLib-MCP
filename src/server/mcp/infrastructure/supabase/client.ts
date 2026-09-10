import { createHash } from "crypto";
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

let cachedClient: { key: string; client: SupabaseClient } | null = null;

/** Service-role client for privileged server-side operations. Null when unavailable. */
export function getSupabaseServiceClient(): SupabaseClient | null {
  if (config.supabaseUrl === undefined || config.supabaseServiceKey === undefined) return null;
  // Never keep the raw service key as an in-memory map key. A sha256 digest
  // is enough for cache identity without retaining secret material.
  const cacheKey = createHash("sha256")
    .update(`${config.supabaseUrl}::${config.supabaseServiceKey}`)
    .digest("hex");
  const cached = cachedClient;
  if (cached && cached.key === cacheKey) return cached.client;
  try {
    const client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    cachedClient = { key: cacheKey, client };
    return client;
  } catch {
    return null;
  }
}

/** Test isolation only. Production code never calls this. */
export function resetSupabaseClientCache(): void {
  cachedClient = null;
}
