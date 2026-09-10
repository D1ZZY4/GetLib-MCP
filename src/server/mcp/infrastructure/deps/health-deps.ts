import type { HealthDeps } from "@/application/health/health.service";
import { ensureRegistryLoaded } from "@/server/mcp/registry/registry-loader";
import { listTools } from "@/server/mcp/registry/tool-registry";
import { listResources } from "@/server/mcp/registry/resource-registry";
import { listPrompts } from "@/server/mcp/registry/prompt-registry";
import { LIBRARY_REGISTRY } from "@/server/mcp/sources/registry";
import { docCache } from "@/server/mcp/services/cache";
import { getCircuitSummary } from "@/server/mcp/services/circuit-breaker";
import { getUptimeSeconds } from "@/server/mcp/services/metrics";
import { getInvocationSummary } from "@/server/mcp/services/telemetry";
import { getDatabaseStatus } from "@/server/mcp/infrastructure/database";

/**
 * Live infrastructure binding for the health snapshot. Route and
 * application adapters inject this; tests inject stubs. No business
 * logic lives here, only wiring between the application seam and the
 * concrete providers. Registry counts stay lazy (functions, not
 * values) because the registry loads on first use, after module import.
 */
export const liveHealthDeps: HealthDeps = {
  ensureRegistryLoaded,
  listTools,
  listResources,
  listPrompts,
  registryEntryCount: () => LIBRARY_REGISTRY.length,
  cacheMemoryEntries: () => docCache.size(),
  getCircuitSummary,
  getUptimeSeconds,
  getInvocationSummary,
  getDatabaseStatus,
};
