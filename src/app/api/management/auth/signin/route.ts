import { z } from "zod";
import { verifyCredentials } from "@/application/auth/auth.service";
import { jsonError, jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const SigninBody = z.object({
  email: z.string().min(1).max(320),
  password: z.string().min(1).max(1024),
});

export async function POST(req: Request) {
  const id = requestId();
  try {
    const { email, password } = SigninBody.parse(await readJsonBody(req));
    if (!verifyCredentials(email, password)) {
      // Neutral on purpose: never reveal whether the email or the
      // password was wrong, or whether auth is configured at all.
      return jsonError("unauthorized", "Those credentials don't match. Try again.", 401, id);
    }
    const name = email.split("@")[0] || "user";
    return jsonOk({ ok: true, name, email: email.trim() });
  } catch (error) {
    return mapRouteError(error, id);
  }
}
