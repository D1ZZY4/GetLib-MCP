import { getMcpServers } from "@/application/mcp/mcp-catalog.service";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET() {
  const id = requestId();
  try {
    return jsonOk(getMcpServers());
  } catch (error) {
    return mapRouteError(error, id);
  }
}
