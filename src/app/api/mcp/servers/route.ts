import { NextResponse } from "next/server";
import { SERVER_NAME, SERVER_VERSION } from "@/server/mcp/constants";
import { listPrompts } from "@/server/mcp/registry/prompt-registry";
import { listResources } from "@/server/mcp/registry/resource-registry";
import { listTools } from "@/server/mcp/registry/tool-registry";
import "@/server/mcp/registry/registry-loader";

export async function GET() {
  const tools = listTools();
  const resources = listResources();
  const prompts = listPrompts();

  return NextResponse.json({
    servers: [
      {
        id: "getlib-local",
        name: SERVER_NAME,
        version: SERVER_VERSION,
        transports: ["stdio", "streamable-http"],
        status: "online",
        counts: {
          tools: tools.length,
          resources: resources.length,
          prompts: prompts.length,
        },
      },
    ],
  });
}
