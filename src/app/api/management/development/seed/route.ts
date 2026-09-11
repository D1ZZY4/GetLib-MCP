import { requireManagementAuth } from "@/application/auth/session";
import { liveApiKeyAuthDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import { seedDevelopmentData } from "@/application/development/development.service";
import { liveDevelopmentDeps } from "@/server/mcp/infrastructure/deps/development-deps";
import { checkRateLimit, STRICT_TIER } from "@/server/mcp/utils/rate-limit";
import { assertOriginOr403, jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function POST(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/development/seed", STRICT_TIER);
    const originBlocked = assertOriginOr403(req, id);
    if (originBlocked) return originBlocked;
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    return jsonOk(await seedDevelopmentData(liveDevelopmentDeps), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
