import { describe, expect, test } from "bun:test";
import { listTools, runTool } from "../registry/tool-registry";
import "../registry/registry-loader";

describe("tool registry", () => {
  test("registers tools without drift", () => {
    expect(listTools().length).toBeGreaterThan(0);
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
