import { requireManagementAuth } from "@/application/auth/session";
import { resetDevelopmentData } from "@/application/development/development.service";
import { liveDevelopmentDeps } from "@/server/mcp/infrastructure/deps/development-deps";
import { checkRateLimit, EXECUTION_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function POST(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/development/reset", EXECUTION_TIER);
    requireManagementAuth(req);
    return jsonOk(await resetDevelopmentData(liveDevelopmentDeps), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
