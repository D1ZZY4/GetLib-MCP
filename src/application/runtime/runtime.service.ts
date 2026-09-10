import { getAuthConfig } from "@/application/auth/auth.service";
import type { DatabaseStatus } from "@/server/mcp/infrastructure/database";
import { getHealthSnapshot, type HealthDeps } from "@/application/health/health.service";
import { getRuntimeSnapshot } from "@/server/mcp/runtime";

export interface RuntimeInfoSnapshot {
  environment: "development" | "production";
  databaseMode: string;
  isMock: boolean;
  supabaseConfigured: boolean;
  nodeEnv: string | undefined;
  vercelEnv: string | undefined;
  auth: ReturnType<typeof getAuthConfig>;
  database: DatabaseStatus;
  health: Awaited<ReturnType<typeof getHealthSnapshot>>;
}

/**
 * Capability seams of the runtime snapshot. The database probe is
 * infrastructure injected here; auth, health, and runtime policy stay
 * directly owned (application-internal or centralized configuration).
 */
export interface RuntimeDeps {
  getDatabaseStatus: () => Promise<DatabaseStatus>;
  health: HealthDeps;
}

/**
 * Control-plane runtime snapshot for Settings and diagnostics. Aggregates
 * environment policy, database status, auth state, and health through one
 * reusable application capability (Web, API, and MCP share it).
 */
export async function getRuntimeInfo(deps: RuntimeDeps): Promise<RuntimeInfoSnapshot> {
  const runtime = getRuntimeSnapshot();
  const [database, health] = await Promise.all([deps.getDatabaseStatus(), getHealthSnapshot(deps.health)]);
  return {
    environment: runtime.environment,
    databaseMode: runtime.databaseMode,
    isMock: runtime.isMock,
    supabaseConfigured: runtime.supabaseConfigured,
    nodeEnv: runtime.nodeEnv,
    vercelEnv: runtime.vercelEnv,
    auth: getAuthConfig(),
    database,
    health,
  };
}
