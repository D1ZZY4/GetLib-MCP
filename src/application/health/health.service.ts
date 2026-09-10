import { getAuthConfig } from "@/application/auth/auth.service";
import { SERVER_NAME, SERVER_VERSION } from "@/server/mcp/constants";
import { listPrompts } from "@/server/mcp/registry/prompt-registry";
import { ensureRegistryLoaded } from "@/server/mcp/registry/registry-loader";
import { listResources } from "@/server/mcp/registry/resource-registry";
import { listTools } from "@/server/mcp/registry/tool-registry";
import { docCache } from "@/server/mcp/services/cache";
import { getCircuitSummary } from "@/server/mcp/services/circuit-breaker";
import { getUptimeSeconds } from "@/server/mcp/services/metrics";
import { LIBRARY_REGISTRY } from "@/server/mcp/sources/registry";
import { getInvocationSummary } from "@/server/mcp/services/telemetry";
import { getDatabaseStatus } from "@/server/mcp/infrastructure/database";
import type { DatabaseStatus } from "@/server/mcp/infrastructure/database";
import { getRuntimeSnapshot } from "@/server/mcp/runtime";

export type HealthStatus = "healthy" | "degraded" | "unavailable";

export interface DependencyCheck {
  status: HealthStatus;
  latencyMs: number | null;
  error: string | null;
  lastCheckedAt: string;
}

export interface HealthSnapshot {
  status: HealthStatus;
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
  environment: "development" | "production";
  databaseMode: string;
  isMock: boolean;
  auth: { enabled: boolean; fallbackActive: boolean };
  dependencies: {
    mcp: DependencyCheck;
    runtime: DependencyCheck;
    database: DependencyCheck;
    cache: DependencyCheck;
    auth: DependencyCheck;
  };
}

function checkNow(status: HealthStatus, latencyMs: number | null = null, error: string | null = null): DependencyCheck {
  return { status, latencyMs, error, lastCheckedAt: new Date().toISOString() };
}

/**
 * Live database probe with TTL cache and single-flight. Health scrapes,
 * the dashboard, and runtime diagnostics share one probe result for
 * DB_PROBE_TTL_MS instead of hitting Supabase per call, and concurrent
 * callers share the in-flight probe instead of stampeding. The probe
 * itself is timeout-bounded inside the repository (5s), so this layer
 * only adds caching, never an unbounded wait.
 */
const DB_PROBE_TTL_MS = 15_000;

let cachedProbe: { at: number; status: DatabaseStatus } | null = null;
let inflightProbe: Promise<DatabaseStatus> | null = null;

async function probeDatabase(fallbackMode: DatabaseStatus["mode"]): Promise<DatabaseStatus> {
  const now = Date.now();
  if (cachedProbe && now - cachedProbe.at < DB_PROBE_TTL_MS) return cachedProbe.status;
  if (inflightProbe) return inflightProbe;
  inflightProbe = getDatabaseStatus().then(
    (status) => {
      cachedProbe = { at: Date.now(), status };
      inflightProbe = null;
      return status;
    },
    (error) => {
      // getStatus never rejects by contract; this guards the factory path
      // so a health scrape can never throw out of the probe.
      inflightProbe = null;
      return {
        mode: fallbackMode,
        health: "unavailable",
        configured: false,
        latencyMs: null,
        error: error instanceof Error ? error.message : String(error),
        checkedAt: new Date().toISOString(),
      } satisfies DatabaseStatus;
    },
  );
  return inflightProbe;
}

/** Test hook - clears the cached probe so tests observe a live result. */
export function resetHealthProbeCache(): void {
  cachedProbe = null;
  inflightProbe = null;
}

function databaseCheck(status: DatabaseStatus, isMock: boolean): DependencyCheck {
  if (isMock || status.health === "mock" || status.health === "healthy") {
    // Mock mode is healthy-by-definition; "mock" from the repository
    // means the same in real-mode edge cases.
    return {
      status: "healthy",
      latencyMs: status.latencyMs,
      error: null,
      lastCheckedAt: status.checkedAt,
    };
  }
  return {
    status: status.health,
    latencyMs: status.latencyMs,
    error: status.error ?? "Database is not healthy.",
    lastCheckedAt: status.checkedAt,
  };
}

/**
 * Operational health snapshot for the MCP control plane. The registry is
 * loaded deterministically on first call, so callers must not import the
 * registry-loader side-effect module themselves. The database dependency
 * is a live cached probe (not config presence): latencyMs and
 * lastCheckedAt are measured, and a dead Supabase degrades the snapshot.
 */
export async function getHealthSnapshot(): Promise<HealthSnapshot> {
  ensureRegistryLoaded();
  const circuits = getCircuitSummary();
  const runtime = getRuntimeSnapshot();
  const auth = getAuthConfig();
  const database = databaseCheck(await probeDatabase(runtime.databaseMode), runtime.isMock);
  const status =
    circuits.open > 0 || database.status === "degraded" || database.status === "unavailable"
      ? "degraded"
      : "healthy";
  return {
    status,
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
    environment: runtime.environment,
    databaseMode: runtime.databaseMode,
    isMock: runtime.isMock,
    auth: { enabled: auth.enabled, fallbackActive: auth.fallbackActive },
    dependencies: {
      mcp: checkNow("healthy", 0, null),
      runtime: checkNow("healthy", 0, null),
      database,
      cache: checkNow("healthy", 0, null),
      auth: checkNow("healthy", 0, null),
    },
  };
}
