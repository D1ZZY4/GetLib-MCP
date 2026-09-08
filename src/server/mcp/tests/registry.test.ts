import { describe, expect, test } from "bun:test";
import { fuzzySearch, LIBRARY_REGISTRY, lookupByAlias, lookupById } from "../sources/registry";
import { definePrompt, renderPrompt } from "../registry/prompt-registry";
import { defineResource } from "../registry/resource-registry";
import { defineTool } from "../registry/tool-registry";
import { ensureRegistryLoaded } from "../registry/registry-loader";

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

describe("capability registries", () => {
  test("duplicate tool registration throws", () => {
    defineTool({ name: "gl_test_collision", description: "collision probe", run: () => ({}) });
    expect(() =>
      defineTool({ name: "gl_test_collision", description: "duplicate", run: () => ({}) }),
    ).toThrow("Duplicate tool registration");
  });

  test("duplicate resource name or URI registration throws", () => {
    defineResource({
      name: "test-collision",
      uri: "getlib://test/collision",
      description: "collision probe",
      read: () => ({}),
    });
    expect(() =>
      defineResource({
        name: "test-collision",
        uri: "getlib://test/other",
        description: "duplicate name",
        read: () => ({}),
      }),
    ).toThrow("Duplicate resource registration");
    expect(() =>
      defineResource({
        name: "test-collision-other",
        uri: "getlib://test/collision",
        description: "duplicate uri",
        read: () => ({}),
      }),
    ).toThrow("Duplicate resource URI registration");
  });

  test("duplicate prompt registration throws", () => {
    definePrompt({ name: "test-collision", description: "collision probe", render: () => ({}) });
    expect(() =>
      definePrompt({ name: "test-collision", description: "duplicate", render: () => ({}) }),
    ).toThrow("Duplicate prompt registration");
  });

  test("empty prompt name throws", () => {
    expect(() => definePrompt({ name: "", description: "empty", render: () => ({}) })).toThrow(
      "must not be empty",
    );
  });
});

describe("registered prompts", () => {
  test("every prompt renders with its declared arguments", async () => {
    ensureRegistryLoaded();
    const rendered = (await renderPrompt("get-docs", {
      libraryId: "facebook/react",
      topic: "hooks",
    })) as { messages: Array<{ content: { text: string } }> };
    expect(rendered.messages[0]?.content.text).toContain("facebook/react");
    expect(rendered.messages[0]?.content.text).toContain("hooks");
  });

  test("missing required arguments throw", async () => {
    ensureRegistryLoaded();
    await expect(renderPrompt("get-docs", {})).rejects.toThrow('Missing required prompt argument: "libraryId"');
    await expect(renderPrompt("get-docs", "not-an-object")).rejects.toThrow(
      "must be an object",
    );
  });

  test("unknown prompt throws", async () => {
    ensureRegistryLoaded();
    await expect(renderPrompt("no-such-prompt")).rejects.toThrow("Unknown prompt");
  });
});
