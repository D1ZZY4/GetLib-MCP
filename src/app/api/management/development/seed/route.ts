import { requireManagementAuth } from "@/application/auth/session";
import { seedDevelopmentData } from "@/application/development/development.service";
import { checkRateLimit, EXECUTION_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function POST(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/development/seed", EXECUTION_TIER);
    requireManagementAuth(req);
    return jsonOk(await seedDevelopmentData(), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
