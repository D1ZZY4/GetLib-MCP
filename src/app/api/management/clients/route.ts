import { requireManagementAuth } from "@/application/auth/session";
import { liveApiKeyAuthDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import { listClients } from "@/application/clients/clients.service";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/clients", READ_TIER);
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    return jsonOk(listClients(), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
