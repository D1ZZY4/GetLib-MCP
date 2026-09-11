import { requireManagementAuth } from "@/application/auth/session";
import { liveApiKeyAuthDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import { liveClientsDeps } from "@/server/mcp/infrastructure/deps/clients-deps";
import { listClients, listPersistentClients } from "@/application/clients/clients.service";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/clients", READ_TIER);
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    // Durable rows first: they survive serverless churn. An empty store
    // (fresh database, unconfigured Supabase) falls back to whatever this
    // process currently sees so the page never blanks for lack of history.
    const persistent = await listPersistentClients(liveClientsDeps);
    return jsonOk(persistent.total > 0 ? persistent : listClients(), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
