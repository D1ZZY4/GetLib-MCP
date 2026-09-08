import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { listPrompts, renderPrompt } from "./registry/prompt-registry";
import { listResources, readResource } from "./registry/resource-registry";
import { listTools, getTool, runTool } from "./registry/tool-registry";
import { registerReviewPrompts } from "./prompts/review.prompt";
import { registerLibraryResources } from "./resources/libraries.resource";
import { registerAuditTools } from "./tools/audit";
import { registerAutoScanTools } from "./tools/auto-scan";
import { registerBatchResolveTools } from "./tools/batch-resolve";
import { registerBestPracticesTools } from "./tools/best-practices";
import { registerChangelogTools } from "./tools/changelog";
import { registerCompatTools } from "./tools/compat";
import { registerCompareTools } from "./tools/compare";
import { registerDispatchTools } from "./tools/dispatch";
import { registerDocsTools } from "./tools/docs";
import { registerExamplesTools } from "./tools/examples";
import { registerMigrationTools } from "./tools/migration";
import { registerResolveTools } from "./tools/resolve";
import { registerSearchTools } from "./tools/search";
import { registerSnippetsTools } from "./tools/snippets";

export function createServer(): McpServer {
  registerDispatchTools();
  registerResolveTools();
  registerDocsTools();
  registerBestPracticesTools();
  registerAutoScanTools();
  registerSearchTools();
  registerAuditTools();
  registerChangelogTools();
  registerCompatTools();
  registerCompareTools();
  registerExamplesTools();
  registerMigrationTools();
  registerBatchResolveTools();
  registerSnippetsTools();
  registerLibraryResources();
  registerReviewPrompts();

  const server = new McpServer(
    { name: "getlib-mcp", version: "0.1.0" },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  for (const tool of listTools()) {
    const name = tool.name;
    const def = getTool(name);
    const inputSchema = def?.inputSchema;
    const respond = async (args: unknown) => {
      const result = (await runTool(name, args)) as {
        content?: Array<{ type: "text"; text: string }>;
      };
      if (result && Array.isArray(result.content)) {
        return { content: result.content };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    };
    server.registerTool(
      name,
      {
        ...(def?.title ? { title: def.title } : {}),
        description: tool.description,
        ...(def?.annotations ? { annotations: def.annotations } : {}),
        ...(def?._meta ? { _meta: def._meta } : {}),
        ...(inputSchema ? { inputSchema: inputSchema as ZodRawShapeCompat } : {}),
      },
      respond,
    );
  }

  for (const resource of listResources()) {
    const name = resource.name;
    server.registerResource(name, resource.uri, { description: resource.description }, async () => ({
      contents: [{ uri: resource.uri, text: JSON.stringify(await readResource(name)) }],
    }));
  }

  for (const prompt of listPrompts()) {
    const name = prompt.name;
    server.registerPrompt(name, { description: prompt.description }, async () => {
      const rendered = (await renderPrompt(name)) as {
        messages: Array<{ role: "user"; content: { type: "text"; text: string } }>;
      };
      return { messages: rendered.messages };
    });
  }

  return server;
}
