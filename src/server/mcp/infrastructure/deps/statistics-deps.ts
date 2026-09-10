import type { StatisticsDeps } from "@/application/statistics/statistics.service";
import { getDatabase } from "@/server/mcp/infrastructure/database";
import { getInvocationSummary, getRecentOutcomes } from "@/server/mcp/services/telemetry";

/**
 * Live infrastructure binding for the statistics snapshot. Route and
 * application adapters inject this; tests inject stubs. No business
 * logic lives here, only wiring between the application seam and the
 * concrete providers.
 */
export const liveStatisticsDeps: StatisticsDeps = {
  getDatabase,
  getInvocationSummary,
  getRecentOutcomes,
};
