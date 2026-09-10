import { requireManagementAuth } from "@/application/auth/session";
import { getDashboardSnapshot } from "@/application/dashboard/dashboard.service";
import { liveDashboardDeps } from "@/server/mcp/infrastructure/deps/dashboard-deps";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/dashboard", READ_TIER);
    requireManagementAuth(req);
    return jsonOk(await getDashboardSnapshot(liveDashboardDeps), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
