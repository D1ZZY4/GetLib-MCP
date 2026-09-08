/**
 * Canonical transport mode registry - the single source of truth for which
 * MCP transports this server supports.
 *
 * Modes:
 * - stdio: local process transport over stdin/stdout (available, see
 *   transport/stdio.ts and the `bun run mcp` script).
 * - streamable-http: remote transport over Streamable HTTP (available at
 *   /api/mcp/http, see transport/http.ts).
 * - sse: legacy Server-Sent Events transport for remote clients
 *   (available at GET /api/mcp/sse, see transport/sse.ts).
 *
 * Both the servers snapshot and the docs UI derive from this list so the
 * mode set cannot drift between surfaces.
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
    description: "Local process transport over stdin/stdout for editor and CLI clients on the same machine.",
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
    description: "Remote transport over Streamable HTTP with session support for dashboard and hosted clients.",
    status: "available",
  },
];

export function transportModeIds(): TransportModeId[] {
  return TRANSPORT_MODES.map((mode) => mode.id);
}
