import { describe, expect, test } from "bun:test";
import { listClients } from "../clients/clients.service";

describe("clients application service", () => {
  test("starts with no connected clients", () => {
    const snapshot = listClients();
    expect(snapshot.total).toBe(0);
    expect(snapshot.clients).toEqual([]);
  });
});
