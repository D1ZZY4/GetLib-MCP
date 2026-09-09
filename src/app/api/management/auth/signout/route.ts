import { SESSION_COOKIE } from "@/application/auth/session";
import { jsonOk, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

/**
 * Destroys the session cookie. Intentionally unauthenticated: clearing a
 * missing or expired credential must always succeed.
 */
export async function POST() {
  const id = requestId();
  try {
    const response = jsonOk({ ok: true }, id);
    response.headers.set(
      "Set-Cookie",
      `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    );
    return response;
  } catch (error) {
    return mapRouteError(error, id);
  }
}
