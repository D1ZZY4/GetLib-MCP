import { describe, expect, test } from "bun:test";
import { fuzzySearch, LIBRARY_REGISTRY, lookupByAlias, lookupById } from "../sources/registry";

describe("library registry", () => {
  test("registry is non-empty", () => {
    expect(LIBRARY_REGISTRY.length).toBeGreaterThan(100);
  });

  test("resolves exact alias", () => {
    expect(lookupByAlias("nextjs")?.id).toBe("vercel/next.js");
  });

  test("alias lookup is case-insensitive", () => {
    expect(lookupByAlias("React")?.id).toBe("facebook/react");
  });

  test("unknown alias returns undefined", () => {
    expect(lookupByAlias("not-a-real-library-xyz")).toBeUndefined();
  });

  test("fuzzy search ranks exact names first", () => {
    const [first] = fuzzySearch("react", 3);
    expect(first?.id).toBe("facebook/react");
  });

  test("lookupById finds entries", () => {
    expect(lookupById("vercel/next.js")?.name).toBe("Next.js");
  });
});
