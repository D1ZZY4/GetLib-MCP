import { getAuthConfig } from "@/application/auth/auth.service";
import { getDatabaseStatus } from "@/server/mcp/infrastructure/database";
import { getHealthSnapshot } from "@/application/health/health.service";
import { getRuntimeSnapshot } from "@/server/mcp/runtime";

export interface RuntimeInfoSnapshot {
  environment: "development" | "production";
  databaseMode: string;
  isMock: boolean;
  supabaseConfigured: boolean;
  nodeEnv: string | undefined;
  vercelEnv: string | undefined;
  auth: ReturnType<typeof getAuthConfig>;
  database: Awaited<ReturnType<typeof getDatabaseStatus>>;
  health: Awaited<ReturnType<typeof getHealthSnapshot>>;
}

/**
 * Control-plane runtime snapshot for Settings and diagnostics. Aggregates
 * environment policy, database status, auth state, and health through one
 * reusable application capability (Web, API, and MCP share it).
 */
export async function getRuntimeInfo(): Promise<RuntimeInfoSnapshot> {
  const runtime = getRuntimeSnapshot();
  const [database, health] = await Promise.all([getDatabaseStatus(), getHealthSnapshot()]);
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
