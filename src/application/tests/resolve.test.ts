import { describe, expect, test } from "bun:test";
import {
  resolveLibraryUseCase,
  type ResolveDeps,
} from "../library/resolve.service";
import type { LibraryMatch } from "@/server/mcp/types";

function baseStubs(): ResolveDeps {
  return {
    lookupByAlias: () => undefined,
    fuzzySearch: () => [],
    resolveBareNameCandidates: async () => [],
    isSourceEnabled: () => true,
    isLibraryBlocked: () => false,
  };
}

const npmExpress: LibraryMatch = {
  id: "npm:express",
  name: "express",
  description: "Fast, unopinionated, minimalist web framework",
  docsUrl: "https://expressjs.com/",
  llmsTxtUrl: undefined,
  githubUrl: undefined,
  score: 70,
  source: "npm",
};

describe("resolve use case with stubbed infrastructure", () => {
  test("explicit npm: prefix routes to the prefixed resolver", async () => {
    let prefixedCalls = 0;
    let bareCalls = 0;
    const result = await resolveLibraryUseCase(
      { libraryName: "npm:express" },
      {
        ...baseStubs(),
        resolvePrefixedCandidate: async (name) => {
          prefixedCalls += 1;
          expect(name).toBe("npm:express");
          return npmExpress;
        },
        resolveBareNameCandidates: async () => {
          bareCalls += 1;
          return [];
        },
      },
    );
    expect(prefixedCalls).toBe(1);
    expect(bareCalls).toBe(0);
    expect(result.resolved).toBe(true);
    expect(result.response.structuredContent?.matches[0]?.id).toBe("npm:express");
  });

  test("prefixed miss ends in a clean miss without fuzzy fallback", async () => {
    let bareCalls = 0;
    const result = await resolveLibraryUseCase(
      { libraryName: "npm:no-such-package-xyz" },
      {
        ...baseStubs(),
        resolvePrefixedCandidate: async () => null,
        resolveBareNameCandidates: async () => {
          bareCalls += 1;
          return [];
        },
      },
    );
    expect(bareCalls).toBe(0);
    expect(result.resolved).toBe(false);
    expect(result.response.content[0]?.text ?? "").toContain("No libraries found");
  });

  test("bare names never touch the prefixed resolver", async () => {
    let prefixedCalls = 0;
    const deps: ResolveDeps = {
      ...baseStubs(),
      resolvePrefixedCandidate: async () => {
        prefixedCalls += 1;
        return null;
      },
    };
    await resolveLibraryUseCase({ libraryName: "express" }, deps);
    expect(prefixedCalls).toBe(0);
  });

  test("stubs without the optional seam still compile and miss cleanly", async () => {
    const result = await resolveLibraryUseCase({ libraryName: "npm:express" }, baseStubs());
    expect(result.resolved).toBe(false);
  });
});
