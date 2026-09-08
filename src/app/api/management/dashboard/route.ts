import { getDashboardSnapshot } from "@/application/dashboard/dashboard.service";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET() {
  const id = requestId();
  try {
    return jsonOk(await getDashboardSnapshot());
  } catch (error) {
    return mapRouteError(error, id);
  }
}
