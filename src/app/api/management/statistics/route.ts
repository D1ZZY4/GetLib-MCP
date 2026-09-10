import { requireManagementAuth } from "@/application/auth/session";
import { getStatisticsSnapshot } from "@/application/statistics/statistics.service";
import { liveStatisticsDeps } from "@/server/mcp/infrastructure/deps/statistics-deps";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/statistics", READ_TIER);
    requireManagementAuth(req);
    return jsonOk(await getStatisticsSnapshot(liveStatisticsDeps), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
