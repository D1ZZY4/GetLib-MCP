import { getHealthSnapshot } from "@/application/health/health.service";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET() {
  const id = requestId();
  try {
    return jsonOk(getHealthSnapshot());
  } catch (error) {
    return mapRouteError(error, id);
  }
}
