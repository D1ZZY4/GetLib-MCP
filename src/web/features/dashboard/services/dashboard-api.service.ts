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
 * Dashboard snapshot from the authoritative backend capability. The
 * backend decides mock vs real - the frontend never branches on mock data
 * itself.
 */
export function fetchDashboard(): Promise<DashboardSnapshot> {
  return fetchJson<DashboardSnapshot>("/api/management/dashboard");
}
