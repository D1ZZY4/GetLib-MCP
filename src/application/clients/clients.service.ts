import type { ClientLister, ClientSessionSnapshot } from "@/domain/mcp/catalog";

export type ConnectedClient = ClientSessionSnapshot;

export interface ClientsSnapshot {
  total: number;
  clients: ConnectedClient[];
}

const listers: ClientLister[] = [];

/**
 * Transport modules register their snapshot listers here (called once per
 * transport at module load and from application init). The application
 * layer never imports transport modules directly, preserving the
 * Transport -> Application -> Domain dependency direction.
 */
export function registerClientLister(lister: ClientLister): void {
  if (!listers.includes(lister)) listers.push(lister);
}

/** Test isolation only. Production code never calls this. */
export function resetClientListers(): void {
  listers.length = 0;
}

/**
 * Recently seen MCP clients for the control plane. Streamable HTTP is
 * stateless (recent-sightings ring); SSE keeps live sessions on hosts with
 * sticky connections. stdio connections are local and not tracked here.
 */
export function listClients(): ClientsSnapshot {
  const clients: ConnectedClient[] = listers.flatMap((lister) => {
    try {
      return lister();
    } catch {
      return [];
    }
  });
  return { total: clients.length, clients };
}
