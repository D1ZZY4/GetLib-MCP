import { listSessions, type ClientSession } from "@/server/mcp/transport/http";

export type { ClientSession };

export interface ClientsSnapshot {
  total: number;
  clients: ClientSession[];
}

/**
 * Connected MCP clients for the control plane. Sessions live in the
 * Streamable HTTP transport of this process; stdio connections are local
 * and not tracked here.
 */
export function listClients(): ClientsSnapshot {
  const clients = listSessions();
  return { total: clients.length, clients };
}
