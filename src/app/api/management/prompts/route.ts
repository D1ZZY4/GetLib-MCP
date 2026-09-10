import { requireManagementAuth } from "@/application/auth/session";
import { liveApiKeyAuthDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import { getMcpCatalog } from "@/application/mcp/mcp-catalog.service";
import { liveMcpCatalogDeps } from "@/server/mcp/infrastructure/deps/mcp-catalog-deps";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/prompts", READ_TIER);
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    return jsonOk({ prompts: getMcpCatalog(liveMcpCatalogDeps).prompts }, id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
