import { describe, expect, test } from "bun:test";
import { TOOL_COUNT } from "../constants";
import { listTools, runTool } from "../registry/tool-registry";
import "../registry/registry-loader";

describe("tool registry", () => {
  test("registers every tool without drift", () => {
    expect(listTools()).toHaveLength(TOOL_COUNT);
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
});
