import { describe, expect, test } from "bun:test";
import { listTools, runTool } from "../registry/tool-registry";
import { listResources } from "../registry/resource-registry";
import { listPrompts } from "../registry/prompt-registry";
import { ensureRegistryLoaded } from "../registry/registry-loader";

ensureRegistryLoaded();

describe("tool registry", () => {
  test("registers tools without drift", () => {
    expect(listTools().length).toBeGreaterThan(0);
  });

  test("capability counts match the documented surface", () => {
    // Lower bounds mirror README ("14 tools, 2 resources, 6 prompts").
    // Growth never breaks this; removal forces a deliberate README update.
    expect(listTools().length).toBeGreaterThanOrEqual(14);
    expect(listResources().length).toBeGreaterThanOrEqual(2);
    expect(listPrompts().length).toBeGreaterThanOrEqual(6);
  });

  test("every tool uses the gl_ namespace with a description", () => {
    for (const tool of listTools()) {
      expect(tool.name.startsWith("gl_")).toBe(true);
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  test("unknown tool throws", async () => {
    await expect(runTool("gl_nope")).rejects.toThrow("Unknown tool");
  });

  test("tools validate their input", async () => {
    await expect(runTool("gl_resolve_library", undefined)).rejects.toThrow();
  });

  test("empty arrays are rejected, not silently accepted", async () => {
    await expect(
      runTool("gl_compat", { feature: "CSS container queries", environments: [] }),
    ).rejects.toThrow();
    await expect(runTool("gl_audit", { categories: [] })).rejects.toThrow();
    await expect(runTool("gl_batch_resolve", { libraryNames: [] })).rejects.toThrow();
  });
});
