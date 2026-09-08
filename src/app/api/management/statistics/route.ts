import { getStatisticsSnapshot } from "@/application/statistics/statistics.service";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET() {
  const id = requestId();
  try {
    return jsonOk(getStatisticsSnapshot());
  } catch (error) {
    return mapRouteError(error, id);
  }
}
