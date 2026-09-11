import { describe, expect, test } from "bun:test";
import {
  examplesUseCase,
  type ExamplesDeps,
} from "../library/examples.service";
import { hasCodeFragment } from "../library/examples-render";

function stubDeps(searchPayload: unknown): ExamplesDeps {
  return {
    githubToken: "test-token",
    fetchWithTimeout: async () =>
      new Response(JSON.stringify(searchPayload), { status: 200 }),
    githubAuthHeaders: () => ({}),
    readBodyCapped: async (res) => res.text(),
    cacheGet: () => undefined,
    cacheSet: () => undefined,
    diskCacheGet: async () => undefined,
    diskCacheSet: () => undefined,
    fallback: {
      lookupById: () => undefined,
      lookupByAlias: () => undefined,
      buildIndex: async () => null,
    },
  };
}

function fileItem(name: string, withCode: boolean): Record<string, unknown> {
  return {
    name,
    path: `src/${name}`,
    html_url: `https://github.com/some/repo/blob/main/src/${name}`,
    repository: {
      full_name: "some/repo",
      description: "a repo",
      html_url: "https://github.com/some/repo",
    },
    ...(withCode
      ? {
        text_matches: [
          { fragment: "import x from 'lib';\nx();", matches: [{ text: "x", indices: [7, 8] }] },
        ],
      }
      : {}),
  };
}

describe("examples use case with stubbed infrastructure", () => {
  test("results with code render code blocks", async () => {
    const result = await examplesUseCase(
      { library: "lib", pattern: "x", maxResults: 5 },
      stubDeps({ total_count: 2, items: [fileItem("a.ts", true), fileItem("b.ts", true)] }),
    );
    expect(result.resolved).toBe(true);
    const text = result.response.content[0]?.text ?? "";
    expect(text).toContain("```");
    expect(text).toContain("with code");
  });

  test("codeless file matches fall back instead of rendering file lists", async () => {
    const result = await examplesUseCase(
      { library: "lib", pattern: "x", maxResults: 5 },
      stubDeps({ total_count: 114688, items: [fileItem("a.ts", false), fileItem("b.ts", false)] }),
    );
    expect(result.resolved).toBe(false);
    const text = result.response.content[0]?.text ?? "";
    expect(text).toContain("No code examples found");
    expect(text).not.toContain("```");
  });

  test("hasCodeFragment rejects blank fragments", () => {
    expect(
      hasCodeFragment({
        name: "a.ts",
        path: "a.ts",
        html_url: "https://example.com",
        repository: { full_name: "o/r", html_url: "https://example.com" },
        text_matches: [{ fragment: "   ", matches: [] }],
      }),
    ).toBe(false);
  });
});
