import { getAuthConfig } from "@/application/auth/auth.service";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

// Intentionally public (no session gate): the dashboard auth probe and
// load balancers must reach this without credentials. The snapshot
// carries only booleans and environment names - never accounts,
// passwords, tokens, or configuration values.
export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/auth/config", READ_TIER);
    return jsonOk(getAuthConfig(), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
