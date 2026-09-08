import { executeTool } from "@/application/mcp/mcp-catalog.service";
import { jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

interface RouteParams {
  params: Promise<{ tool: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const id = requestId();
  try {
    const { tool } = await params;
    const args = await readJsonBody(request);
    return jsonOk(await executeTool(tool, args));
  } catch (error) {
    return mapRouteError(error, id);
  }
}
