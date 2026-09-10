import type { McpCatalogDeps } from "@/application/mcp/mcp-catalog.service";
import { getDatabase } from "@/server/mcp/infrastructure/database";
import { listLogs } from "@/server/mcp/middleware/logging";
import { listPrompts } from "@/server/mcp/registry/prompt-registry";
import { ensureRegistryLoaded } from "@/server/mcp/registry/registry-loader";
import { listResources } from "@/server/mcp/registry/resource-registry";
import { getTool, listTools, runTool } from "@/server/mcp/registry/tool-registry";

/**
 * Live infrastructure binding for the MCP catalog. Route and application
 * adapters inject this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveMcpCatalogDeps: McpCatalogDeps = {
  ensureRegistryLoaded,
  listTools,
  getTool,
  listResources,
  listPrompts,
  runTool,
  getDatabase,
  listLogs,
};
