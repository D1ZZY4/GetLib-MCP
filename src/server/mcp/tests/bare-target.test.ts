import { describe, expect, test } from "bun:test";
import { resolveBareTarget, resolveDocsTarget } from "../services/docs/docs-resolve";
import { resolveSnippetTarget } from "../services/snippets/resolve";
import { buildTopicUrls } from "../services/links";

describe("resolveBareTarget", () => {
  test("resolves npm: ids", () => {
    expect(resolveBareTarget("npm:react")).toEqual({ kind: "npm", pkg: "react" });
  });

  test("rejects traversal in npm: ids", () => {
    expect(typeof resolveBareTarget("npm:../etc")).toBe("string");
  });

  test("resolves pypi: ids", () => {
    expect(resolveBareTarget("pypi:fastapi")).toEqual({ kind: "pypi", pkg: "fastapi" });
  });

  test("resolves public URLs", () => {
    expect(resolveBareTarget("https://docs.example.com")).toEqual({
      kind: "url",
      url: "https://docs.example.com",
      hostname: "docs.example.com",
    });
  });

  test("rejects private URLs", () => {
    expect(typeof resolveBareTarget("http://127.0.0.1:3000/x")).toBe("string");
  });

  test("returns null for bare registry names", () => {
    expect(resolveBareTarget("react")).toBeNull();
  });
});

describe("resolveSnippetTarget delegation", () => {
  test("npm: target matches docs semantics", () => {
    const target = resolveSnippetTarget("npm:react");
    if (typeof target === "string") throw new Error(`unexpected refusal: ${target}`);
    expect(target.docsUrl).toBe("https://www.npmjs.com/package/react");
    expect(target.displayName).toBe("react");
  });

  test("private URL refused with shared message", () => {
    expect(resolveSnippetTarget("http://127.0.0.1:3000/x")).toBe(
      "URL not allowed: must be a public HTTPS address.",
    );
  });
});

describe("resolveDocsTarget devdocs mapping", () => {
  test("devdocs tailwindcss URL resolves to official registry docs", async () => {
    const target = await resolveDocsTarget("https://devdocs.io/tailwindcss/", null);
    if (typeof target === "string") throw new Error(`unexpected refusal: ${target}`);
    expect(target.docsUrl).toBe("https://tailwindcss.com/docs");
    expect(target.displayName).toBe("Tailwind CSS");
  });

  test("devdocs unknown slug keeps the bare URL target", async () => {
    const target = await resolveDocsTarget("https://devdocs.io/unknowntechxyz/", null);
    if (typeof target === "string") throw new Error(`unexpected refusal: ${target}`);
    expect(target.docsUrl).toBe("https://devdocs.io/unknowntechxyz/");
    expect(target.displayName).toBe("devdocs.io");
  });
});

describe("registry UI libraries", () => {
  test("heroui resolves by alias to official docs", async () => {
    const { lookupByAlias } = await import("../sources/registry");
    const entry = lookupByAlias("heroui");
    expect(entry?.docsUrl).toBe("https://heroui.com/docs/react/getting-started");
    const target = await resolveDocsTarget("heroui", entry ?? null);
    if (typeof target === "string") throw new Error(`unexpected refusal: ${target}`);
    expect(target.docsUrl).toBe("https://heroui.com/docs/react/getting-started");
  });

  test("shadcn resolves to ui.shadcn.com docs", async () => {
    const { lookupByAlias } = await import("../sources/registry");
    expect(lookupByAlias("shadcn")?.docsUrl).toBe("https://ui.shadcn.com/docs");
  });

  test("mantine resolves to mantine.dev docs", async () => {
    const { lookupByAlias } = await import("../sources/registry");
    expect(lookupByAlias("mantine")?.docsUrl).toContain("https://mantine.dev/");
  });
});

describe("buildTopicUrls devdocs guard", () => {
  test("returns no guessed URLs for devdocs hosts", () => {
    expect(buildTopicUrls("https://devdocs.io/tailwindcss/", "tailwindcss", undefined)).toEqual([]);
  });

  test("still builds topic URLs for official docs hosts", () => {
    const urls = buildTopicUrls("https://tailwindcss.com/docs", "tailwindcss", ["/docs/{slug}"]);
    expect(urls).toContain("https://tailwindcss.com/docs/tailwindcss");
  });
});
