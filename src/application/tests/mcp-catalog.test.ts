import { describe, expect, test } from "bun:test";
import {
  executeTool,
  getMcpCatalog,
  getMcpServers,
  listMcpLogs,
  parseLogLimit,
} from "../mcp/mcp-catalog.service";

describe("mcp catalog application service", () => {
  test("catalog exposes tools, resources, and prompts", () => {
    const catalog = getMcpCatalog();
    expect(catalog.tools.length).toBeGreaterThan(0);
    expect(catalog.resources.length).toBeGreaterThan(0);
    expect(catalog.prompts.length).toBeGreaterThan(0);
  });

  test("servers snapshot carries canonical counts", () => {
    const catalog = getMcpCatalog();
    const snapshot = getMcpServers();
    expect(snapshot.servers).toHaveLength(1);
    expect(snapshot.servers[0]?.counts.tools).toBe(catalog.tools.length);
    expect(snapshot.servers[0]?.counts.resources).toBe(catalog.resources.length);
    expect(snapshot.servers[0]?.counts.prompts).toBe(catalog.prompts.length);
  });

  test("executeTool rejects unknown tools with 404 semantics", async () => {
    await expect(executeTool("gl_nope", {})).rejects.toThrow("Unknown tool");
  });

  test("executeTool rejects malformed tool names", async () => {
    await expect(executeTool("../escape", {})).rejects.toThrow("Invalid tool name");
    await expect(executeTool("", {})).rejects.toThrow("Invalid tool name");
  });

  test("parseLogLimit clamps and validates", () => {
    expect(parseLogLimit(null)).toBe(50);
    expect(parseLogLimit("200")).toBe(100);
    expect(() => parseLogLimit("0")).toThrow("Invalid limit");
    expect(() => parseLogLimit("abc")).toThrow("Invalid limit");
  });

  test("listMcpLogs respects the limit", () => {
    const { logs, total } = listMcpLogs(10);
    expect(logs.length).toBeLessThanOrEqual(10);
    expect(total).toBeGreaterThanOrEqual(logs.length);
  });
});
