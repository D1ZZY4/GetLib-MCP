import { describe, expect, test } from "bun:test";
import {
  LogLimitError,
  ToolNameValidationError,
  executeTool,
  getMcpCatalog,
  getMcpServers,
  listMcpLogs,
  parseLogLimit,
} from "../mcp/mcp-catalog.service";
import { liveMcpCatalogDeps } from "@/server/mcp/infrastructure/deps/mcp-catalog-deps";

describe("mcp catalog application service", () => {
  test("catalog exposes tools, resources, and prompts", () => {
    const catalog = getMcpCatalog(liveMcpCatalogDeps);
    expect(catalog.tools.length).toBeGreaterThan(0);
    expect(catalog.resources.length).toBeGreaterThan(0);
    expect(catalog.prompts.length).toBeGreaterThan(0);
  });

  test("servers snapshot carries canonical counts", () => {
    const catalog = getMcpCatalog(liveMcpCatalogDeps);
    const snapshot = getMcpServers(liveMcpCatalogDeps);
    expect(snapshot.servers).toHaveLength(1);
    expect(snapshot.servers[0]?.counts.tools).toBe(catalog.tools.length);
    expect(snapshot.servers[0]?.counts.resources).toBe(catalog.resources.length);
    expect(snapshot.servers[0]?.counts.prompts).toBe(catalog.prompts.length);
  });

  test("executeTool rejects unknown tools with 404 semantics", async () => {
    await expect(executeTool(liveMcpCatalogDeps, "gl_nope", {})).rejects.toThrow("Unknown tool");
  });

  test("executeTool rejects malformed tool names", async () => {
    await expect(executeTool(liveMcpCatalogDeps, "../escape", {})).rejects.toThrow("Invalid tool name");
    await expect(executeTool(liveMcpCatalogDeps, "", {})).rejects.toThrow("Invalid tool name");
  });

  test("parseLogLimit clamps and validates", () => {
    expect(parseLogLimit(null)).toBe(50);
    expect(parseLogLimit("200")).toBe(100);
    expect(() => parseLogLimit("0")).toThrowError(LogLimitError);
    expect(() => parseLogLimit("0")).toThrow("Invalid limit");
    expect(() => parseLogLimit("abc")).toThrowError(LogLimitError);
    expect(() => parseLogLimit("abc")).toThrow("Invalid limit");
    try {
      parseLogLimit("0");
    } catch (error) {
      expect(error).not.toBeInstanceOf(ToolNameValidationError);
    }
  });

  test("listMcpLogs respects the limit", async () => {
    const { logs, total } = await listMcpLogs(liveMcpCatalogDeps, 10);
    expect(logs.length).toBeLessThanOrEqual(10);
    expect(total).toBeGreaterThanOrEqual(logs.length);
  });

  test("catalog, servers, and health agree on capability counts", async () => {
    const catalog = getMcpCatalog(liveMcpCatalogDeps);
    const servers = getMcpServers(liveMcpCatalogDeps);
    expect(servers.servers).toHaveLength(1);
    const server = servers.servers[0];
    expect(server?.counts.tools).toBe(catalog.tools.length);
    expect(server?.counts.resources).toBe(catalog.resources.length);
    expect(server?.counts.prompts).toBe(catalog.prompts.length);
    for (const tool of catalog.tools) {
      expect(tool.name.length).toBeGreaterThan(0);
      expect(tool.description.length).toBeGreaterThan(0);
      expect(Array.isArray(tool.inputKeys)).toBe(true);
    }
    for (const resource of catalog.resources) {
      expect(resource.uri.length).toBeGreaterThan(0);
    }
  });
});
