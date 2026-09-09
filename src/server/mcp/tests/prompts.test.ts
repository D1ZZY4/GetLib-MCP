import { describe, expect, test } from "bun:test";
import { ensureRegistryLoaded } from "../registry/registry-loader";
import { listPrompts, renderPrompt } from "../registry/prompt-registry";

ensureRegistryLoaded();

const FULL_ARGS: Record<string, Record<string, string>> = {
  "review-libraries": { projectPath: "." },
  "get-docs": { libraryId: "facebook/react", topic: "hooks" },
  "best-practices": { libraryId: "vercel/next.js", topic: "performance" },
  "migrate-library": { libraryId: "vercel/next.js", fromVersion: "14", toVersion: "15" },
  "audit-project": { projectPath: "." },
  "compare-libraries": { libraries: "react,vue", criteria: "performance" },
};

function messagesOf(rendered: unknown): Array<{ content?: { text?: string } }> {
  const value = rendered as { messages?: Array<{ content?: { text?: string } }> };
  return value.messages ?? [];
}

describe("prompt registry", () => {
  // NOTE: other test files register throwaway fixtures (e.g.
  // "test-collision") into the same global registry, so every
  // assertion below scopes to the six documented prompts instead of
  // assuming an exact registry size.
  const KNOWN = Object.keys(FULL_ARGS);

  test("registers the six documented prompts", () => {
    const names = listPrompts().map((prompt) => prompt.name);
    for (const name of KNOWN) {
      expect(names).toContain(name);
    }
  });

  test("every prompt renders with full args and non-empty text", async () => {
    for (const name of KNOWN) {
      const rendered = await renderPrompt(name, FULL_ARGS[name] ?? {});
      const messages = messagesOf(rendered);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0]?.content?.text?.length ?? 0).toBeGreaterThan(0);
    }
  });

  test("every prompt renders with no args without crashing", async () => {
    const defs = new Map(listPrompts().map((prompt) => [prompt.name, prompt]));
    for (const name of KNOWN) {
      const required = (defs.get(name)?.args ?? []).filter((arg) => arg.required);
      if (required.length > 0) {
        await expect(renderPrompt(name, {})).rejects.toThrow("Missing required prompt argument");
      } else {
        const messages = messagesOf(await renderPrompt(name, {}));
        expect(messages.length).toBeGreaterThan(0);
      }
    }
  });

  test("garbage args never crash rendering", async () => {
    const defs = new Map(listPrompts().map((prompt) => [prompt.name, prompt]));
    for (const name of KNOWN) {
      const garbage: Record<string, string> = { nonsense: "asdasdasdxyz !@#$%" };
      for (const arg of defs.get(name)?.args ?? []) {
        garbage[arg.name] = arg.required ? "garbage-xyz" : "";
      }
      const messages = messagesOf(await renderPrompt(name, garbage));
      expect(messages.length).toBeGreaterThan(0);
    }
  });

  test("unknown prompt throws", async () => {
    await expect(renderPrompt("gl_nope", {})).rejects.toThrow("Unknown prompt");
  });
});
