import { handleHttpRequest } from "@/server/mcp/transport/http";

export async function GET(req: Request): Promise<Response> {
  return handleHttpRequest(req);
}

export async function POST(req: Request): Promise<Response> {
  return handleHttpRequest(req);
}

export async function DELETE(req: Request): Promise<Response> {
  return handleHttpRequest(req);
}
