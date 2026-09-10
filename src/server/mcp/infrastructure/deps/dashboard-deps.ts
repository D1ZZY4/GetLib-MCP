import type { DashboardDeps } from "@/application/dashboard/dashboard.service";
import { liveHealthDeps } from "@/server/mcp/infrastructure/deps/health-deps";
import { liveMcpCatalogDeps } from "@/server/mcp/infrastructure/deps/mcp-catalog-deps";
import { liveStatisticsDeps } from "@/server/mcp/infrastructure/deps/statistics-deps";
import { getDatabase, getDatabaseStatus } from "@/server/mcp/infrastructure/database";
import { listLogs } from "@/server/mcp/middleware/logging";
import { getRecentOutcomes } from "@/server/mcp/services/telemetry";

/**
 * Live infrastructure binding for the dashboard snapshot. Route
 * adapters inject this; tests inject stubs. Sibling application seams
 * are forwarded from their own live bindings, never re-wired here. No
 * business logic lives here, only wiring between the application seam
 * and the concrete providers.
 */
export const liveDashboardDeps: DashboardDeps = {
  catalog: liveMcpCatalogDeps,
  statistics: liveStatisticsDeps,
  health: liveHealthDeps,
  getDatabase,
  getDatabaseStatus,
  listLogs,
  getRecentOutcomes,
};
