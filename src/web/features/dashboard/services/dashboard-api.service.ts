import { fetchJson } from "@/web/lib/api-client";
import type {
  DashboardStats,
  MockActivity,
  MockAttention,
  MockLibrary,
} from "@/web/types/library";

export type DashboardLibrary = MockLibrary;
export type DashboardActivity = MockActivity;
export type DashboardAttention = MockAttention;
export type { DashboardStats };

export interface DashboardSnapshot {
  stats: DashboardStats;
  libraries: DashboardLibrary[];
  activities: DashboardActivity[];
  attentions: DashboardAttention[];
  system: {
    status: string;
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
  database: {
    mode: string;
    health: string;
    configured: boolean;
    latencyMs: number | null;
    error: string | null;
    checkedAt: string;
  };
  isMock: boolean;
}

/**
 * Dashboard snapshot from the authoritative backend capability.
 * The backend determines mock vs real; the frontend must never branch
 * on mock data independently - see `flows-and-runtime.md` section 7.
 */
export function fetchDashboard(): Promise<DashboardSnapshot> {
  return fetchJson<DashboardSnapshot>("/api/management/dashboard");
}
