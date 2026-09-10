import { z } from "zod";
import { signInUseCase } from "@/application/auth/auth.service";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieAttributes,
} from "@/application/auth/session";
import { checkRateLimit, STRICT_TIER } from "@/server/mcp/utils/rate-limit";
import { nonBlankString } from "@/server/mcp/utils/schemas";
import { jsonError, jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const SigninBody = z.object({
  email: nonBlankString(320),
  password: nonBlankString(1024),
});

export async function POST(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/auth/signin", STRICT_TIER);
    const { email, password } = SigninBody.parse(await readJsonBody(req));
    const session = signInUseCase(email, password);
    if (!session) {
      // Neutral on purpose: never reveal whether the email or the
      // password was wrong, or whether auth is configured at all.
      return jsonError("unauthorized", "Those credentials don't match. Try again.", 401, id);
    }
    const response = jsonOk({ ok: true, name: session.name, email: session.email }, id);
    response.headers.set(
      "Set-Cookie",
      `${SESSION_COOKIE}=${encodeURIComponent(createSessionToken(session.email))}; ${sessionCookieAttributes()}`,
    );
    return response;
  } catch (error) {
    return mapRouteError(error, id);
  }
}
