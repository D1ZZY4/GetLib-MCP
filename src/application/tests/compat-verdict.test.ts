import { describe, expect, test } from "bun:test";
import { compatUseCase, type CompatDeps } from "../compat/compat.service";

function stubDeps(overrides: Partial<CompatDeps> = {}): CompatDeps {
  return {
    resolveMdnCandidates: async () => ["Array/at"],
    fetchBcdSection: async () => null,
    fetchRenderedMdn: async () => null,
    fetchCaniuse: async () => null,
    fetchMdnSearchPage: async () => null,
    cacheGet: () => undefined,
    cacheSet: () => {},
    ...overrides,
  };
}

describe("compat verdict uses shared domain contract", () => {
  test("BCD evidence is authoritative strong", async () => {
    const { response } = await compatUseCase(
      { feature: "Array.at()", tokens: 1000 },
      stubDeps({
        fetchBcdSection: async () => ({ text: "BCD table for Array.at()", url: "https://example.com/bcd", sourceType: "bcd" }),
      }),
    );
    const evidence = (response.structuredContent as { evidence: { verdict: string; ok: boolean } }).evidence;
    expect(evidence.verdict).toBe("strong");
    expect(evidence.ok).toBe(true);
  });

  test("search-only fallback stays weak, never miss", async () => {
    const { response } = await compatUseCase(
      { feature: "Array.at()", tokens: 1000 },
      stubDeps({
        fetchMdnSearchPage: async () => ({ text: "search results page", url: "https://example.com/search", sourceType: "search" }),
      }),
    );
    const evidence = (response.structuredContent as { evidence: { verdict: string } }).evidence;
    expect(evidence.verdict).toBe("weak");
  });

  test("no sections resolves false with miss verdict", async () => {
    const { response, resolved } = await compatUseCase({ feature: "Array.at()", tokens: 1000 }, stubDeps());
    expect(resolved).toBe(false);
    const evidence = (response.structuredContent as { evidence: { verdict: string } }).evidence;
    expect(evidence.verdict).toBe("miss");
  });
});
