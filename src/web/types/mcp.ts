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
  transport: "streamable-http" | "sse";
  connectedAt: string;
  lastSeenAt: string;
  userAgent?: string;
  name?: string;
  version?: string;
  authType?: "anonymous" | "session" | "api_key";
}

export interface ClientsSnapshot {
  total: number;
  clients: McpClientSession[];
}

export interface ApiKeyView {
  id: number;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ApiKeysSnapshot {
  keys: ApiKeyView[];
}

export interface CreatedApiKey extends ApiKeyView {
  key: string;
}

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
