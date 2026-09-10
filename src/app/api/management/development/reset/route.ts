import { requireManagementAuth } from "@/application/auth/session";
import { liveApiKeyAuthDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import { resetDevelopmentData } from "@/application/development/development.service";
import { liveDevelopmentDeps } from "@/server/mcp/infrastructure/deps/development-deps";
import { checkRateLimit, STRICT_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function POST(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/development/reset", STRICT_TIER);
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    return jsonOk(await resetDevelopmentData(liveDevelopmentDeps), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
