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
  transport: "streamable-http" | "sse";
  connectedAt: string;
  lastSeenAt: string;
  userAgent?: string;
}
