import { NextResponse } from "next/server";
import { runTool } from "@/server/mcp/registry/tool-registry";
import "@/server/mcp/registry/registry-loader";

interface RouteParams {
  params: Promise<{ tool: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { tool } = await params;

  let args: unknown;
  try {
    args = await request.json();
  } catch {
    args = undefined;
  }

  try {
    const result = await runTool(tool, args);
    return NextResponse.json({ tool, result });
  } catch {
    return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 404 });
  }
}
