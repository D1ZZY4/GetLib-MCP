import { requireManagementAuth } from "@/application/auth/session";
import { getSettingsSnapshot } from "@/application/settings/settings.service";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/settings", READ_TIER);
    requireManagementAuth(req);
    return jsonOk(await getSettingsSnapshot(), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
