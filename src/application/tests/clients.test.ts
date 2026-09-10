import { describe, expect, test } from "bun:test";
import { listClients, registerClientLister, resetClientListers } from "../clients/clients.service";

describe("clients application service", () => {
  test("starts with no connected clients", () => {
    resetClientListers();
    const snapshot = listClients();
    expect(snapshot.total).toBe(0);
    expect(snapshot.clients).toEqual([]);
  });

  test("aggregates registered transport listers without importing transports", () => {
    resetClientListers();
    try {
      registerClientLister(() => [
        {
          id: "test-client",
          transport: "sse" as const,
          connectedAt: new Date(0).toISOString(),
          lastSeenAt: new Date(0).toISOString(),
        },
      ]);
      const snapshot = listClients();
      expect(snapshot.total).toBe(1);
      expect(snapshot.clients[0]?.id).toBe("test-client");
    } finally {
      resetClientListers();
    }
  });
});
