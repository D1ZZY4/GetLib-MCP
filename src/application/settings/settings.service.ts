import { getAuthConfig } from "@/application/auth/auth.service";
import { getMcpServers } from "@/application/mcp/mcp-catalog.service";
import { getDatabaseStatus } from "@/server/mcp/infrastructure/database";
import { SERVER_NAME, SERVER_VERSION } from "@/server/mcp/constants";
import { detectEnvironment, resolveDatabaseMode } from "@/server/mcp/runtime";

export interface SettingsSnapshot {
  general: {
    server: string;
    version: string;
    environment: "development" | "production";
  };
  authentication: {
    enabled: boolean;
    fallbackActive: boolean;
  };
  mcp: {
    transports: string[];
    tools: number;
    resources: number;
    prompts: number;
  };
  database: {
    mode: string;
    isMock: boolean;
    configured: boolean;
  };
}

/**
 * Application configuration snapshot for the Settings surface.
 * Read-only: every value here is env-driven and changes require an
 * environment update plus restart. Secrets are never included.
 */
export async function getSettingsSnapshot(): Promise<SettingsSnapshot> {
  const environment = detectEnvironment();
  const databaseMode = resolveDatabaseMode(environment);
  const auth = getAuthConfig();
  const servers = getMcpServers();
  const database = await getDatabaseStatus();
  const primary = servers.servers[0];
  return {
    general: { server: SERVER_NAME, version: SERVER_VERSION, environment },
    authentication: { enabled: auth.enabled, fallbackActive: auth.fallbackActive },
    mcp: {
      transports: primary ? [...primary.transports] : [],
      tools: primary?.counts.tools ?? 0,
      resources: primary?.counts.resources ?? 0,
      prompts: primary?.counts.prompts ?? 0,
    },
    database: {
      mode: databaseMode,
      isMock: databaseMode === "mock",
      configured: database.configured,
    },
  };
}
