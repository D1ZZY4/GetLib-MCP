import { handleHttpRequest } from "@/server/mcp/transport/http";

/**
 * Canonical MCP protocol boundary.
 *
 * The Streamable HTTP transport lives here; the legacy SSE transport
 * stays under /api/mcp/sse. The handler is stateless (fresh server and
 * transport per request), so this alias behaves identically on
 * long-running hosts and serverless isolates.
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
