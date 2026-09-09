import { requireManagementAuth } from "@/application/auth/session";
import { getMcpServers } from "@/application/mcp/mcp-catalog.service";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/servers", READ_TIER);
    requireManagementAuth(req);
    return jsonOk(getMcpServers(), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
