import { getHealthSnapshot } from "@/application/health/health.service";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

// Intentionally public (no session gate): load balancers, Docker
// HEALTHCHECK, and uptime monitors must reach this without credentials.
// The snapshot carries no secrets - see health.service.ts.
export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/health", READ_TIER);
    return jsonOk(await getHealthSnapshot(), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
