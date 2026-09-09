import { getAuthConfig } from "@/application/auth/auth.service";
import { listClients } from "@/application/clients/clients.service";
import { getHealthSnapshot } from "@/application/health/health.service";
import { getMcpCatalog, getMcpServers } from "@/application/mcp/mcp-catalog.service";
import { getDatabaseStatus, getDatabase } from "@/server/mcp/infrastructure/database";
import type { StoredLogEntry } from "@/server/mcp/infrastructure/database";
import { getRuntimeSnapshot, resolveDatabaseMode } from "@/server/mcp/runtime";
import { getInvocationSummary, getRecentOutcomes } from "@/server/mcp/services/telemetry";
import { listLogs } from "@/server/mcp/middleware/logging";

/**
 * Dashboard application service - the single operational overview
 * capability shared by Web, API, and MCP consumers.
 *
 * Mock policy: development mock mode returns the historical deterministic
 * demo payload (flagged isMock) so the UI keeps its valid existing
 * behavior without deciding mock-vs-real itself. Real database modes
 * return live telemetry-derived data instead of fake libraries.
 */

export interface DashboardLibrary {
  id: string;
  name: string;
  installedVersion: string;
  latestVersion: string;
  status: "up-to-date" | "outdated" | "vulnerable";
  lastCheckedAt: string;
}

export interface DashboardActivity {
  id: string;
  kind: "docs" | "resolve" | "audit" | "scan";
  title: string;
  detail: string;
  timestamp: string;
}

export interface DashboardAttention {
  id: string;
  libraryName: string;
  message: string;
  severity: "high" | "medium" | "low";
  /**
   * Version transition, only for library-update items. Operational
   * warnings (credentials, database) leave these unset instead of
   * inventing fake versions like "default" -> "rotated".
   */
  installedVersion?: string;
  latestVersion?: string;
  /** Deep link to the surface that resolves the warning, if any. */
  actionHref?: string;
  actionLabel?: string;
}

export interface DashboardStats {
  totalLibraries: number;
  upToDate: number;
  outdated: number;
  vulnerable: number;
}

export interface DashboardSnapshot {
  stats: DashboardStats;
  libraries: DashboardLibrary[];
  activities: DashboardActivity[];
  attentions: DashboardAttention[];
  system: {
    status: "healthy" | "degraded" | "unavailable";
    environment: string;
    databaseMode: string;
    isMock: boolean;
    authEnabled: boolean;
    fallbackActive: boolean;
    uptimeSeconds: number;
  };
  mcp: {
    tools: number;
    resources: number;
    prompts: number;
    servers: number;
    transports: string[];
    clients: number;
    cacheEntries: number;
    totalCalls: number;
    successRate: number;
    errorRate: number;
  };
  database: Awaited<ReturnType<typeof getDatabaseStatus>>;
  isMock: boolean;
}

const MOCK_LIBRARIES: DashboardLibrary[] = [
  {
    id: "react",
    name: "react",
    installedVersion: "19.2.0",
    latestVersion: "19.2.0",
    status: "up-to-date",
    lastCheckedAt: "2026-09-06T09:00:00Z",
  },
  {
    id: "tailwindcss",
    name: "tailwindcss",
    installedVersion: "4.0.0",
    latestVersion: "4.1.13",
    status: "outdated",
    lastCheckedAt: "2026-09-06T09:00:00Z",
  },
  {
    id: "supabase-js",
    name: "@supabase/supabase-js",
    installedVersion: "2.57.4",
    latestVersion: "2.116.0",
    status: "outdated",
    lastCheckedAt: "2026-09-05T14:30:00Z",
  },
  {
    id: "mcp-sdk",
    name: "@modelcontextprotocol/sdk",
    installedVersion: "1.12.0",
    latestVersion: "1.30.0",
    status: "outdated",
    lastCheckedAt: "2026-09-05T14:30:00Z",
  },
  {
    id: "example-vuln",
    name: "example-legacy-auth",
    installedVersion: "1.4.2",
    latestVersion: "2.0.1",
    status: "vulnerable",
    lastCheckedAt: "2026-09-04T11:15:00Z",
  },
];

const MOCK_ACTIVITIES: DashboardActivity[] = [
  {
    id: "act-1",
    kind: "resolve",
    title: "Resolved react",
    detail: "gl_resolve_library matched react to v19.2.0 docs",
    timestamp: "2026-09-06T09:12:00Z",
  },
  {
    id: "act-2",
    kind: "docs",
    title: "Viewed tailwindcss docs",
    detail: "gl_get_docs fetched Vite plugin setup guide",
    timestamp: "2026-09-06T08:47:00Z",
  },
  {
    id: "act-3",
    kind: "audit",
    title: "Audited 5 libraries",
    detail: "gl_audit found 1 vulnerable and 2 outdated packages",
    timestamp: "2026-09-05T14:32:00Z",
  },
  {
    id: "act-4",
    kind: "scan",
    title: "Scanned project imports",
    detail: "gl_auto_scan detected 5 direct dependencies",
    timestamp: "2026-09-05T14:28:00Z",
  },
];

const MOCK_ATTENTIONS: DashboardAttention[] = [
  {
    id: "att-1",
    libraryName: "example-legacy-auth",
    message: "Known auth bypass fixed in v2.0.1. Upgrade recommended.",
    severity: "high",
    installedVersion: "1.4.2",
    latestVersion: "2.0.1",
  },
  {
    id: "att-2",
    libraryName: "tailwindcss",
    message: "Minor release available with Vite plugin fixes.",
    severity: "medium",
    installedVersion: "4.0.0",
    latestVersion: "4.1.13",
  },
  {
    id: "att-3",
    libraryName: "@modelcontextprotocol/sdk",
    message: "New transports and tool listing improvements available.",
    severity: "low",
    installedVersion: "1.12.0",
    latestVersion: "1.30.0",
  },
];

function mockStats(): DashboardStats {
  return {
    totalLibraries: MOCK_LIBRARIES.length,
    upToDate: MOCK_LIBRARIES.filter((lib) => lib.status === "up-to-date").length,
    outdated: MOCK_LIBRARIES.filter((lib) => lib.status === "outdated").length,
    vulnerable: MOCK_LIBRARIES.filter((lib) => lib.status === "vulnerable").length,
  };
}

function kindForTool(tool: string): DashboardActivity["kind"] {
  if (tool.includes("audit")) return "audit";
  if (tool.includes("scan")) return "scan";
  if (tool.includes("resolve")) return "resolve";
  return "docs";
}

/**
 * Maps one durable log row to a dashboard activity item. Pure so the
 * production activity feed is unit-testable without a database.
 */
export function mapStoredLogToActivity(entry: StoredLogEntry): DashboardActivity {
  return {
    id: `db-${entry.id}`,
    kind: kindForTool(entry.name),
    title: `${entry.ok ? "Ran" : "Failed"} ${entry.name}`,
    detail: `${entry.durationMs}ms - ${entry.ok ? "ok" : "error"}`,
    timestamp: entry.timestamp,
  };
}

async function liveActivities(): Promise<DashboardActivity[]> {
  // Production reads durable storage so recent activity survives
  // serverless isolates and reflects every persisted run, not just the
  // ones this process happened to execute. Anything less makes the
  // dashboard lie about activity on multi-instance hosts.
  if (resolveDatabaseMode() === "supabase-production") {
    try {
      const stored = await getDatabase().listLogs(8);
      if (stored.length > 0) {
        return stored.map(mapStoredLogToActivity);
      }
    } catch {
      // Fall through to the in-memory sources below.
    }
  }
  const outcomes = getRecentOutcomes().slice(-8).reverse();
  if (outcomes.length === 0) {
    const logs = listLogs().slice(0, 8);
    return logs.map((entry) => ({
      id: `log-${entry.id}`,
      kind: kindForTool(entry.name),
      title: `${entry.ok ? "Ran" : "Failed"} ${entry.name}`,
      detail: `${entry.durationMs}ms - ${entry.ok ? "ok" : "error"}`,
      timestamp: entry.timestamp,
    }));
  }
  return outcomes.map((o) => ({
    id: `${o.tool}-${o.requestId}`,
    kind: kindForTool(o.tool),
    title: `${o.success ? "Ran" : "Failed"} ${o.tool}`,
    detail: `${o.durationMs}ms${o.cacheHit ? " (cache hit)" : ""} - ${o.resolved ? "resolved" : "unresolved"}`,
    timestamp: new Date(o.ts).toISOString(),
  }));
}

function fallbackAttention(): DashboardAttention {
  return {
    id: "att-fallback",
    libraryName: "authentication",
    message: "Default bootstrap credentials are active. Rotate them immediately.",
    severity: "high",
    actionHref: "/settings?tab=account",
    actionLabel: "Review credentials",
  };
}

function liveAttentions(params: {
  fallbackActive: boolean;
  databaseError: string | null;
  circuitsOpen: number;
}): DashboardAttention[] {
  const items: DashboardAttention[] = [];
  if (params.fallbackActive) {
    items.push(fallbackAttention());
  }
  if (params.databaseError) {
    items.push({
      id: "att-db",
      libraryName: "database",
      message: `Database degraded: ${params.databaseError}`,
      severity: "high",
      actionHref: "/mcp/health",
      actionLabel: "Check health",
    });
  }
  if (params.circuitsOpen > 0) {
    items.push({
      id: "att-circuits",
      libraryName: "providers",
      message: `${params.circuitsOpen} provider circuit(s) open. External fetches are failing fast.`,
      severity: "medium",
    });
  }
  return items;
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const runtime = getRuntimeSnapshot();
  const auth = getAuthConfig();
  const health = getHealthSnapshot();
  const catalog = getMcpCatalog();
  const servers = getMcpServers();
  const database = await getDatabaseStatus();
  const telemetry = getInvocationSummary();
  const clients = listClients();

  const mcp = {
    tools: catalog.tools.length,
    resources: catalog.resources.length,
    prompts: catalog.prompts.length,
    servers: servers.servers.length,
    transports: servers.servers.flatMap((server) => server.transports),
    clients: clients.total,
    cacheEntries: health.cache.memoryEntries,
    totalCalls: telemetry.totalCalls,
    successRate: telemetry.successRate,
    errorRate: telemetry.errorRate,
  };

  const systemStatus =
    database.health === "unavailable" || health.status === "degraded" ? "degraded" : "healthy";

  if (runtime.isMock) {
    return {
      stats: mockStats(),
      libraries: MOCK_LIBRARIES,
      activities: MOCK_ACTIVITIES,
      attentions: [
        ...MOCK_ATTENTIONS,
        ...(auth.fallbackActive ? [fallbackAttention()] : []),
      ],
      system: {
        status: systemStatus,
        environment: runtime.environment,
        databaseMode: runtime.databaseMode,
        isMock: true,
        authEnabled: auth.enabled,
        fallbackActive: auth.fallbackActive,
        uptimeSeconds: health.uptimeSeconds,
      },
      mcp,
      database,
      isMock: true,
    };
  }

  const activities = await liveActivities();
  const attentions = liveAttentions({
    fallbackActive: auth.fallbackActive,
    databaseError: database.health === "healthy" ? null : (database.error ?? "degraded"),
    circuitsOpen: health.circuits.open,
  });

  return {
    stats: { totalLibraries: 0, upToDate: 0, outdated: 0, vulnerable: 0 },
    libraries: [],
    activities,
    attentions,
    system: {
      status: database.health === "unavailable" ? "unavailable" : systemStatus,
      environment: runtime.environment,
      databaseMode: runtime.databaseMode,
      isMock: false,
      authEnabled: auth.enabled,
      fallbackActive: auth.fallbackActive,
      uptimeSeconds: health.uptimeSeconds,
    },
    mcp,
    database,
    isMock: false,
  };
}
