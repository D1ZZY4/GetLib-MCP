import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ensureRegistryLoaded } from "../registry/registry-loader";
import { runTool } from "../registry/tool-registry";
import { nonBlankString } from "../utils/schemas";
import { hasNoResultSignal, passesFeatureGate } from "../services/compat-sources";
import { passesIdentityGate } from "../tools/best-practices";

ensureRegistryLoaded();

describe("F2 - blank inputs are clean validation errors", () => {
  test("nonBlankString accepts real input", () => {
    expect(nonBlankString(200).parse("react")).toBe("react");
  });

  test("nonBlankString rejects empty and whitespace-only input", () => {
    expect(() => nonBlankString(200).parse("")).toThrow();
    expect(() => nonBlankString(200).parse("   ")).toThrow(/non-whitespace/);
    expect(() => nonBlankString(5).parse("123456")).toThrow();
  });

  test("blank batch members are rejected", async () => {
    await expect(runTool("gl_batch_resolve", { libraryNames: ["react", "   "] })).rejects.toThrow();
  });
});

describe("F1 - fuzzy-identity gate for best practices", () => {
  const guidesGarbage = [
    "# Guides",
    "",
    "See the getting-started guide and howto articles for general advice.",
    "More guides and tutorials in the index.",
  ].join("\n");

  test("unrelated guides fail the gate for a bare garbage identifier", () => {
    expect(passesIdentityGate(guidesGarbage, "garbage-xyz", "some-junk-repo")).toBe(false);
  });

  test("registry identifiers always pass the gate", () => {
    expect(passesIdentityGate(guidesGarbage, "facebook/react", "React")).toBe(true);
  });

  test("explicit npm targets always pass the gate", () => {
    expect(passesIdentityGate(guidesGarbage, "npm:express", "express")).toBe(true);
  });

  test("content mentioning the library passes the gate", () => {
    const text = "# React Best Practices\n\nReact hooks patterns.\n\nReact performance tips for React apps.";
    expect(passesIdentityGate(text, "unknown-react-wrapper", "React")).toBe(true);
  });
});

describe("F3 - distinctive-token gate for compat", () => {
  test("generic-word matches do not pass for garbage features", () => {
    const featurePolicyPage = [
      "# FeaturePolicy",
      "",
      "The FeaturePolicy interface allows a page to specify which browser feature may be used.",
      "Use allowsFeature() to check a feature at runtime.",
    ].join("\n");
    expect(passesFeatureGate(featurePolicyPage, "asdasdasdxyz nonexistent feature 123")).toBe(false);
  });

  test("explicit no-result signals are detected on raw search pages", () => {
    expect(hasNoResultSignal("Search results for asdasdasdxyz. 0 results found.")).toBe(true);
    expect(hasNoResultSignal("Nothing found for this query.")).toBe(true);
    expect(hasNoResultSignal("Baseline 2023 newly available across browsers.")).toBe(false);
  });

  test("genuine coverage passes", () => {
    const text = [
      "# CSS Container Queries",
      "",
      "CSS container queries let components respond to container size.",
      "Container queries ship in all modern browsers with @container rules.",
    ].join("\n");
    expect(passesFeatureGate(text, "CSS container queries")).toBe(true);
  });
});

describe("F4 - audit reconciles with auto_scan on manifest-only dirs", () => {
  test("manifest-only directory names auto_scan instead of disagreeing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gl-audit-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ dependencies: { express: "^4.0.0" } }));
    const result = (await runTool("gl_audit", { categories: ["all"], projectPath: dir })) as {
      content: Array<{ text?: string }>;
    };
    const text = result.content[0]?.text ?? "";
    expect(text).toContain("No source files found");
    expect(text).toContain("gl_auto_scan");
  });
});
