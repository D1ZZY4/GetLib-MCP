import type { SettingsDeps } from "@/application/settings/settings.service";
import { getDatabaseStatus } from "@/server/mcp/infrastructure/database";
import { liveMcpCatalogDeps } from "@/server/mcp/infrastructure/deps/mcp-catalog-deps";

/**
 * Live infrastructure binding for the settings snapshot. Route adapters
 * inject this; tests inject stubs. No business logic lives here, only
 * wiring between the application seam and the concrete providers.
 */
export const liveSettingsDeps: SettingsDeps = {
  getDatabaseStatus,
  catalog: liveMcpCatalogDeps,
};
