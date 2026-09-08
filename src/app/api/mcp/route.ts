import { NextResponse } from "next/server";
import { listPrompts } from "@/server/mcp/registry/prompt-registry";
import { listResources } from "@/server/mcp/registry/resource-registry";
import { listTools } from "@/server/mcp/registry/tool-registry";
import "@/server/mcp/registry/registry-loader";

export async function GET() {
  return NextResponse.json({
    tools: listTools(),
    resources: listResources(),
    prompts: listPrompts(),
  });
}
