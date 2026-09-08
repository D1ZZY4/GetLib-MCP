/**
 * Web-owned MCP control-plane contracts.
 *
 * These mirror the application-layer snapshots shape-for-shape, but live in
 * web/ so the frontend never imports backend modules (not even type-only).
 * If the API contract changes, update both sides together and keep the
 * field names identical.
 */

export interface McpClientSession {
  id: string;
  transport: "streamable-http";
  connectedAt: string;
  lastSeenAt: string;
  userAgent?: string;
}

export interface ClientsSnapshot {
  total: number;
  clients: McpClientSession[];
}

export type HealthStatus = "healthy" | "degraded";

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
}
