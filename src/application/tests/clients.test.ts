import { describe, expect, test } from "bun:test";
import {
  listClients,
  listPersistentClients,
  registerClientLister,
  resetClientListers,
  toConnectedClient,
  type ClientsDeps,
} from "../clients/clients.service";
import { MockDatabaseRepository } from "@/server/mcp/infrastructure/database/mock-repository";
import type { ClientRecord } from "@/server/mcp/infrastructure/database";

function stubDeps(): { deps: ClientsDeps; repo: MockDatabaseRepository } {
  const repo = new MockDatabaseRepository();
  return {
    repo,
    deps: {
      getDatabase: () => repo,
    },
  };
}

describe("clients service", () => {
  test("deduplicates live sightings by stable identity id", () => {
    resetClientListers();
    try {
      registerClientLister(() => [
        {
          id: "opencode=aaa",
          name: "opencode",
          transport: "sse",
          connectedAt: "2026-01-01T00:00:00.000Z",
          lastSeenAt: "2026-01-01T00:01:00.000Z",
        },
        {
          id: "opencode=aaa",
          name: "opencode",
          transport: "sse",
          connectedAt: "2026-01-01T00:02:00.000Z",
          lastSeenAt: "2026-01-01T00:03:00.000Z",
        },
      ]);
      const snapshot = listClients();
      expect(snapshot.total).toBe(1);
      expect(snapshot.clients[0]?.connectedAt).toBe("2026-01-01T00:00:00.000Z");
      expect(snapshot.clients[0]?.lastSeenAt).toBe("2026-01-01T00:03:00.000Z");
    } finally {
      resetClientListers();
    }
  });

  test("a throwing lister does not zero out healthy transports", () => {
    resetClientListers();
    try {
      registerClientLister(() => {
        throw new Error("broken");
      });
      registerClientLister(() => [
        {
          id: "cursor=bbb",
          name: "cursor",
          transport: "streamable-http",
          connectedAt: "2026-01-01T00:00:00.000Z",
          lastSeenAt: "2026-01-01T00:00:00.000Z",
        },
      ]);
      const snapshot = listClients();
      expect(snapshot.total).toBe(1);
      expect(snapshot.clients[0]?.id).toBe("cursor=bbb");
    } finally {
      resetClientListers();
    }
  });

  test("persistent list maps durable rows onto snapshots", async () => {
    const { deps, repo } = stubDeps();
    await repo.touchClient({
      id: "opencode=ccc",
      name: "opencode",
      clientVersion: "1.18.30",
      transport: "streamable-http",
      userAgent: "opencode/1.18.30",
      authType: "anonymous",
    });
    const snapshot = await listPersistentClients(deps);
    expect(snapshot.total).toBe(1);
    expect(snapshot.clients[0]).toMatchObject({
      id: "opencode=ccc",
      name: "opencode",
      version: "1.18.30",
      authType: "anonymous",
      transport: "streamable-http",
      userAgent: "opencode/1.18.30",
    });
  });

  test("persistent list skips rows with untracked transports", async () => {
    const { deps, repo } = stubDeps();
    await repo.touchClient({
      id: "local=ddd",
      name: "local",
      transport: "stdio",
      authType: "anonymous",
    });
    const snapshot = await listPersistentClients(deps);
    expect(snapshot.total).toBe(0);
  });

  test("persistent list degrades to empty when storage throws", async () => {
    const snapshot = await listPersistentClients({
      getDatabase: () => ({
        listClients: () => Promise.reject(new Error("down")),
      }),
    });
    expect(snapshot).toEqual({ total: 0, clients: [] });
  });

  test("toConnectedClient rejects unknown transports", () => {
    const record: ClientRecord = {
      id: "x=1",
      name: "x",
      clientVersion: null,
      transport: "carrier-pigeon",
      userAgent: null,
      apiKeyId: null,
      authType: "anonymous",
      firstSeenAt: "2026-01-01T00:00:00.000Z",
      lastSeenAt: "2026-01-01T00:00:00.000Z",
      requestCount: 1,
    };
    expect(toConnectedClient(record)).toBeNull();
  });
});
