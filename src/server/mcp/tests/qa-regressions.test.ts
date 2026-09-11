import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ensureRegistryLoaded } from "../registry/registry-loader";
import { runTool } from "../registry/tool-registry";
import { nonBlankString } from "../utils/schemas";
import { hasNoResultSignal, passesFeatureGate } from "../services/compat-sources";
import { checkEvidence } from "../utils/evidence";
import { isGarbageContent } from "../services/content-guards";
import { passesIdentityGate } from "@/application/library/best-practices.service";
import { liveBestPracticesDeps } from "../infrastructure/deps/best-practices-deps";

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
    expect(passesIdentityGate(guidesGarbage, "garbage-xyz", "some-junk-repo", liveBestPracticesDeps)).toBe(false);
  });

  test("registry identifiers always pass the gate", () => {
    expect(passesIdentityGate(guidesGarbage, "facebook/react", "React", liveBestPracticesDeps)).toBe(true);
  });

  test("explicit npm targets always pass the gate", () => {
    expect(passesIdentityGate(guidesGarbage, "npm:express", "express", liveBestPracticesDeps)).toBe(true);
  });

  test("content mentioning the library passes the gate", () => {
    const text = "# React Best Practices\n\nReact hooks patterns.\n\nReact performance tips for React apps.";
    expect(passesIdentityGate(text, "unknown-react-wrapper", "React", liveBestPracticesDeps)).toBe(true);
  });

  test("version-like and dotted garbage identifiers stay behind the gate", () => {
    const text = "# React Best Practices\n\nReact hooks patterns.\n\nReact performance tips for React apps.";
    expect(passesIdentityGate(text, "1.2.3", "1.2.3", liveBestPracticesDeps)).toBe(false);
    expect(passesIdentityGate(text, "v15.0", "v15.0", liveBestPracticesDeps)).toBe(false);
    expect(passesIdentityGate(guidesGarbage, "junk-repo", "junk", liveBestPracticesDeps)).toBe(false);
    // Bare hostnames stay explicit by design: the user addressed a host,
    // so the gate trusts the address and the fetch layer validates it.
    expect(passesIdentityGate(guidesGarbage, "junk-repo.io", "junk", liveBestPracticesDeps)).toBe(true);
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
    try {
      writeFileSync(join(dir, "package.json"), JSON.stringify({ dependencies: { express: "^4.0.0" } }));
      const result = (await runTool("gl_audit", { categories: ["all"], projectPath: dir })) as {
        content: Array<{ text?: string }>;
      };
      const text = result.content[0]?.text ?? "";
      expect(text).toContain("No source files found");
      expect(text).toContain("gl_auto_scan");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("F5 - doc-viewer chrome shells are garbage, never documentation", () => {  // Verbatim shape of a served DevDocs shell: viewer chrome, no substance.
  const devdocsShell = [
    "Title: DevDocs",
    "",
    "URL Source: https://devdocs.io/tailwindcss/tailwindcss",
    "",
    "Warning: This is a cached snapshot of the original page, consider retry with caching opt-out.",
    "",
    "Markdown Content:",
    "You're browsing the Tailwind CSS documentation. To browse all docs, go to [devdocs.io](https://devdocs.io/) (or press `esc`).",
    "",
    "Clear search",
    "# [DevDocs](https://devdocs.io/)",
    "",
    "[Preferences](https://devdocs.io/settings)",
  ].join("\n");

  test("viewer shell is garbage", () => {
    expect(isGarbageContent(devdocsShell)).toEqual({ garbage: true, reason: "app chrome shell" });
  });

  test("real docs with code and headings stay clean", () => {
    const text = [
      "# CSS Container Queries",
      "",
      "CSS container queries let components respond to container size.",
      "Press esc to exit fullscreen videos in any browser.",
      "",
      "```css",
      ".card { container-type: inline-size; }",
      "```",
    ].join("\n");
    expect(isGarbageContent(text)).toEqual({ garbage: false, reason: "" });
  });

  test("long guides quoting chrome phrases stay clean", () => {
    const body = `Press esc to close the dialog. Clear search to reset filters. ${"lorem ipsum dolor sit amet ".repeat(200)}`;
    expect(isGarbageContent(body)).toEqual({ garbage: false, reason: "" });
  });
});

describe("F6 - morphological word families count as topic evidence", () => {
  test("installation query is evidenced by installing/install prose", () => {
    const text = [
      "## Installing Tailwind CSS as a Vite plugin",
      "",
      "Install tailwindcss and the Vite plugin via npm. Then configure Vite.",
    ].join("\n");
    const check = checkEvidence(text, "tailwindcss installation vite");
    expect(check.matchedTokens).toContain("installation");
    expect(check.ok).toBe(true);
  });

  test("unrelated install mentions do not pass a different topic", () => {
    const text = "## Installing Tailwind CSS as a Vite plugin\n\nInstall via npm.";
    expect(checkEvidence(text, "postgres row level security").ok).toBe(false);
  });
});
