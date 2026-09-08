import { getRuntimeInfo } from "@/application/runtime/runtime.service";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET() {
  const id = requestId();
  try {
    return jsonOk(await getRuntimeInfo());
  } catch (error) {
    return mapRouteError(error, id);
  }
}
