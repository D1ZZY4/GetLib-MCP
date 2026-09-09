import { getAuthConfig } from "@/application/auth/auth.service";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/auth/config", READ_TIER);
    return jsonOk(getAuthConfig(), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
