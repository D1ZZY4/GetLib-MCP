import { getAuthConfig } from "@/application/auth/auth.service";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET() {
  const id = requestId();
  try {
    return jsonOk(getAuthConfig());
  } catch (error) {
    return mapRouteError(error, id);
  }
}
