import { clearSessionCookie } from "@/application/auth/session";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, requestId, assertOriginOr403 } from "@/app/api/_lib/route-helpers";

/**
 * Destroys the session cookie. Intentionally unauthenticated: clearing a
 * missing or expired credential must always succeed.
 */
export async function POST(req: Request) {
  const id = requestId();
  try {
    // Read budget on purpose: clearing a credential must stay available
    // even under abuse pressure, otherwise users get locked into sessions.
    checkRateLimit(req, "management/auth/signout", READ_TIER);
    const originBlocked = assertOriginOr403(req, id);
    if (originBlocked) return originBlocked;
    const response = jsonOk({ ok: true }, id);
    response.headers.set("Set-Cookie", clearSessionCookie());
    return response;
  } catch (error) {
    return mapRouteError(error, id);
  }
}
