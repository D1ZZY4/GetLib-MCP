import { handleHttpRequest } from "@/server/mcp/transport/http";

/**
 * Compatibility alias for the canonical MCP boundary at /api/mcp (see
 * ../route.ts). Kept so existing client configurations keep working;
 * both routes share the same stateless handler and behavior.
 */
export async function GET(req: Request): Promise<Response> {
  return handleHttpRequest(req);
}

export async function POST(req: Request): Promise<Response> {
  return handleHttpRequest(req);
}

export async function DELETE(req: Request): Promise<Response> {
  return handleHttpRequest(req);
}
