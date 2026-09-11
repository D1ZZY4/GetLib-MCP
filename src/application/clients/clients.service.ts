import type { ClientLister, ClientSessionSnapshot } from "@/domain/mcp/catalog";
import type { ClientRecord, DatabaseRepository } from "@/server/mcp/infrastructure/database";
import { log } from "@/server/mcp/utils/logger";

export type ConnectedClient = ClientSessionSnapshot;

export interface ClientsSnapshot {
  total: number;
  clients: ConnectedClient[];
}

export interface ClientsDeps {
  getDatabase: () => Pick<DatabaseRepository, "listClients">;
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
 *
 * Entries are deduplicated by stable identity id: one SSE client holding
 * several ephemeral sessions still reads as one client, keeping the
 * newest last-seen stamp and the earliest connected stamp.
 */
export function listClients(): ClientsSnapshot {
  const seen = new Map<string, ConnectedClient>();
  for (const lister of listers) {
    let entries: ConnectedClient[];
    try {
      entries = lister();
    } catch (error) {
      // A broken lister must not zero out healthy transports, but the
      // breakage must be visible somewhere: log once per failing lister.
      log({ level: "warn", msg: "clients.lister-failed", error: String(error) });
      continue;
    }
    for (const entry of entries) {
      const existing = seen.get(entry.id);
      if (!existing) {
        seen.set(entry.id, entry);
        continue;
      }
      seen.set(entry.id, {
        ...existing,
        ...entry,
        connectedAt: existing.connectedAt < entry.connectedAt ? existing.connectedAt : entry.connectedAt,
        lastSeenAt: existing.lastSeenAt > entry.lastSeenAt ? existing.lastSeenAt : entry.lastSeenAt,
      });
    }
  }
  const clients = [...seen.values()];
  return { total: clients.length, clients };
}

const PERSISTED_CLIENTS_LIMIT = 100;

/** Map one durable row onto the control-plane snapshot. Null when the row carries a transport outside the tracked set. */
export function toConnectedClient(record: ClientRecord): ConnectedClient | null {
  if (record.transport !== "sse" && record.transport !== "streamable-http") return null;
  return {
    id: record.id,
    name: record.name,
    ...(record.clientVersion !== null ? { version: record.clientVersion } : {}),
    authType: record.authType,
    transport: record.transport,
    connectedAt: record.firstSeenAt,
    lastSeenAt: record.lastSeenAt,
    ...(record.userAgent !== null ? { userAgent: record.userAgent } : {}),
  };
}

/**
 * Authoritative read path: durable `mcp_clients` rows newest first, so the
 * dashboard survives serverless instance churn instead of showing only
 * whatever this process happens to remember. Never rejects: unreadable
 * storage yields [] and callers fall back to live transport snapshots.
 */
export async function listPersistentClients(deps: ClientsDeps): Promise<ClientsSnapshot> {
  let records: ClientRecord[];
  try {
    records = await deps.getDatabase().listClients(PERSISTED_CLIENTS_LIMIT);
  } catch (error) {
    log({ level: "warn", msg: "clients.persistent-read-failed", error: String(error) });
    return { total: 0, clients: [] };
  }
  const clients: ConnectedClient[] = [];
  for (const record of records) {
    const mapped = toConnectedClient(record);
    if (mapped) clients.push(mapped);
  }
  return { total: clients.length, clients };
}
