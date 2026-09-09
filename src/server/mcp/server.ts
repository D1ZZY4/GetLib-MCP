import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { z } from "zod";
import { SERVER_NAME, SERVER_VERSION } from "./constants";
import { getPrompt, listPrompts, renderPrompt, type GlPromptArg } from "./registry/prompt-registry";
import { listResources, readResource } from "./registry/resource-registry";
import { listTools, getTool, runTool } from "./registry/tool-registry";
import { ensureRegistryLoaded } from "./registry/registry-loader";

export function createServer(): McpServer {
  ensureRegistryLoaded();

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
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
    const def = getPrompt(name);
    const argsSchema = def?.args ? toPromptArgsSchema(def.args) : undefined;
    const respond = async (args: unknown) => {
      const rendered = (await renderPrompt(name, args)) as {
        messages: Array<{ role: "user"; content: { type: "text"; text: string } }>;
      };
      return { messages: rendered.messages };
    };
    server.registerPrompt(
      name,
      {
        description: prompt.description,
        ...(argsSchema ? { argsSchema: argsSchema as ZodRawShapeCompat } : {}),
      },
      respond,
    );
  }

  return server;
}

function toPromptArgsSchema(args: GlPromptArg[]): Record<string, z.ZodType> {
  const shape: Record<string, z.ZodType> = {};
  for (const arg of args) {
    const field = z.string().describe(arg.description);
    shape[arg.name] = arg.required ? field : field.optional();
  }
  return shape;
}
