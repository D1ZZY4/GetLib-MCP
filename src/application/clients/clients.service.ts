import { listSessions, type ClientSession } from "@/server/mcp/transport/http";
import { listSseSessions, type SseClientSession } from "@/server/mcp/transport/sse";

export type { ClientSession };
export type ConnectedClient = ClientSession | SseClientSession;

export interface ClientsSnapshot {
  total: number;
  clients: ConnectedClient[];
}

/**
 * Connected MCP clients for the control plane. Sessions live in the
 * Streamable HTTP and SSE transports of this process; stdio connections
 * are local and not tracked here.
 */
export function listClients(): ClientsSnapshot {
  const clients: ConnectedClient[] = [...listSessions(), ...listSseSessions()];
  return { total: clients.length, clients };
}
