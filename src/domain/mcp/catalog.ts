/**
 * Domain: MCP capability contracts.
 *
 * Canonical ownership for transport modes and connected-client shapes.
 * Pure types and data only - no I/O, no framework imports, no business
 * rules. Transport implementations and application services both depend
 * on these contracts instead of on each other.
 */

export type TransportModeId = "stdio" | "sse" | "streamable-http";

export type TransportModeStatus = "available" | "planned";

export interface TransportMode {
  id: TransportModeId;
  label: string;
  description: string;
  status: TransportModeStatus;
}

export const TRANSPORT_MODES: readonly TransportMode[] = [
  {
    id: "stdio",
    label: "STDIO",
    description:
      "Local process transport over stdin/stdout for editor and CLI clients on the same machine.",
    status: "available",
  },
  {
    id: "sse",
    label: "SSE",
    description: "Legacy Server-Sent Events transport for remote clients over GET /api/mcp/sse.",
    status: "available",
  },
  {
    id: "streamable-http",
    label: "Streamable HTTP",
    description:
      "Remote transport over Streamable HTTP with session support for dashboard and hosted clients.",
    status: "available",
  },
];

export function transportModeIds(): TransportModeId[] {
  return TRANSPORT_MODES.map((mode) => mode.id);
}

export interface ClientSessionSnapshot {
  id: string;
  // stdio excluded by contract: local-process connections are never
  // tracked as control-plane clients (see clients.service).
  transport: Exclude<TransportModeId, "stdio">;
  /** ISO-8601 creation timestamp. */
  connectedAt: string;
  /** ISO-8601 last-seen timestamp. */
  lastSeenAt: string;
  userAgent?: string;
  /** Stable-client display metadata; identity keying lives in client-identity. */
  name?: string;
  version?: string;
  authType?: "anonymous" | "session" | "api_key";
}

/**
 * Port for connected-client snapshots. Transport implementations provide
 * listers; the application layer aggregates them without importing
 * transport modules, keeping the dependency direction
 * Transport -> Application -> Domain intact. Listers are synchronous by
 * contract: a throwing lister is treated as an empty sighting.
 */
export type ClientLister = () => ClientSessionSnapshot[];
