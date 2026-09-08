import { SERVER_NAME, SERVER_VERSION } from "@/server/mcp/constants";
import { listPrompts } from "@/server/mcp/registry/prompt-registry";
import { listResources } from "@/server/mcp/registry/resource-registry";
import { listTools } from "@/server/mcp/registry/tool-registry";
import { docCache } from "@/server/mcp/services/cache";
import { getCircuitSummary } from "@/server/mcp/services/circuit-breaker";
import { getUptimeSeconds } from "@/server/mcp/services/metrics";
import { LIBRARY_REGISTRY } from "@/server/mcp/sources/registry";
import { getInvocationSummary } from "@/server/mcp/services/telemetry";

export interface HealthSnapshot {
  status: "healthy" | "degraded";
  name: string;
  version: string;
  uptimeSeconds: number;
  tools: number;
  resources: number;
  prompts: number;
  registryEntries: number;
  cache: { memoryEntries: number };
  circuits: { open: number; halfOpen: number; closed: number };
  telemetry: {
    totalCalls: number;
    successRate: number;
    resolveRate: number;
    errorRate: number;
    byTool: Record<string, { calls: number; successRate: number; resolveRate: number; p50: number; p95: number }>;
  };
}

/**
 * Operational health snapshot for the MCP control plane. Callers must
 * ensure the registries are loaded first (import the registry-loader
 * side-effect module) so primitive counts reflect this process.
 */
export function getHealthSnapshot(): HealthSnapshot {
  const circuits = getCircuitSummary();
  return {
    status: circuits.open > 0 ? "degraded" : "healthy",
    name: SERVER_NAME,
    version: SERVER_VERSION,
    uptimeSeconds: getUptimeSeconds(),
    tools: listTools().length,
    resources: listResources().length,
    prompts: listPrompts().length,
    registryEntries: LIBRARY_REGISTRY.length,
    cache: { memoryEntries: docCache.size() },
    circuits,
    telemetry: getInvocationSummary(),
  };
}
