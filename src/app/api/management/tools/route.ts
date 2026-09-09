import { requireManagementAuth } from "@/application/auth/session";
import { getMcpCatalog } from "@/application/mcp/mcp-catalog.service";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/tools", READ_TIER);
    requireManagementAuth(req);
    return jsonOk({ tools: getMcpCatalog().tools }, id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
