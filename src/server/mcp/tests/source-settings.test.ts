import { describe, expect, test } from "bun:test";
import {
  checkLibraryAccess,
  getSourceSettings,
  isLibraryBlocked,
  isSourceEnabled,
  updateSourceSettings,
} from "../services/source-settings";

describe("source settings store", () => {
  test("everything is enabled and unblocked by default", () => {
    expect(isSourceEnabled("search-mdn")).toBe(true);
    expect(isSourceEnabled("no-such-source")).toBe(true);
    expect(isLibraryBlocked("react")).toBe(false);
    expect(checkLibraryAccess("react")).toBeNull();
  });

  test("wildcards win over blocked entries", async () => {
    await updateSourceSettings({ blocked: ["facebook"], wildcards: ["facebook/react"] });
    try {
      expect(isLibraryBlocked("facebook/react", ["React"])).toBe(false);
      expect(isLibraryBlocked("facebook/hermes")).toBe(true);
      expect(checkLibraryAccess("facebook/hermes")).toContain("blocked");
    } finally {
      await updateSourceSettings({ disabled: [], blocked: [], wildcards: [] });
    }
  });

  test("disabled sources report off and round-trip through get", async () => {
    await updateSourceSettings({ disabled: ["search-mojeek"], blocked: [], wildcards: [] });
    try {
      expect(isSourceEnabled("search-mojeek")).toBe(false);
      expect(isSourceEnabled("search-mdn")).toBe(true);
      expect(getSourceSettings().disabled).toEqual(["search-mojeek"]);
    } finally {
      await updateSourceSettings({ disabled: [], blocked: [], wildcards: [] });
    }
  });

  test("unknown source ids are rejected", async () => {
    await expect(updateSourceSettings({ disabled: ["nope"] })).rejects.toThrow("Unknown source ids");
  });
});
