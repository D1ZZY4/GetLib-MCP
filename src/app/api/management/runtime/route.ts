import { requireManagementAuth } from "@/application/auth/session";
import { liveApiKeyAuthDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import { getRuntimeInfo } from "@/application/runtime/runtime.service";
import { liveRuntimeDeps } from "@/server/mcp/infrastructure/deps/runtime-deps";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/runtime", READ_TIER);
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    return jsonOk(await getRuntimeInfo(liveRuntimeDeps), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
