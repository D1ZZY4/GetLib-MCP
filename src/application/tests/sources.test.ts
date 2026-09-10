import { describe, expect, test } from "bun:test";
import { getSourcesSnapshot, updateSourcesSettings } from "../sources/sources.service";
import { liveSourcesDeps } from "@/server/mcp/infrastructure/deps/sources-deps";

describe("sources application service", () => {
  test("exposes live source groups with entry counts", () => {
    const snapshot = getSourcesSnapshot(liveSourcesDeps);
    expect(snapshot.groups.length).toBeGreaterThan(0);
    for (const group of snapshot.groups) {
      expect(group.items.length).toBeGreaterThan(0);
      for (const source of group.items) {
        expect(source.entries).toBeGreaterThan(0);
        expect(source.enabled).toBe(true);
      }
    }
    expect(snapshot.registryEntries).toBeGreaterThan(100);
    expect(snapshot.totalEntries).toBeGreaterThanOrEqual(snapshot.registryEntries);
  });

  test("snapshot merges stored enabled flags and lists", async () => {
    await updateSourcesSettings(liveSourcesDeps, { disabled: ["search-mojeek"], blocked: ["x"], wildcards: ["y"] });
    try {
      const snapshot = getSourcesSnapshot(liveSourcesDeps);
      const mojeek = snapshot.groups
        .flatMap((group) => group.items)
        .find((source) => source.id === "search-mojeek");
      expect(mojeek?.enabled).toBe(false);
      expect(snapshot.blocked).toEqual(["x"]);
      expect(snapshot.wildcards).toEqual(["y"]);
    } finally {
      await updateSourcesSettings(liveSourcesDeps, { disabled: [], blocked: [], wildcards: [] });
    }
  });
});
