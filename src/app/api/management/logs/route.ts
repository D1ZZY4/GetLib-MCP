import { requireManagementAuth } from "@/application/auth/session";
import { listMcpLogs, parseLogLimit } from "@/application/mcp/mcp-catalog.service";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/logs", READ_TIER);
    requireManagementAuth(req);
    const url = new URL(req.url);
    const limit = parseLogLimit(url.searchParams.get("limit"));
    return jsonOk(await listMcpLogs(limit), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
