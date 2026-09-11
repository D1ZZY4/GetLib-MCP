import { z } from "zod";
import { requireManagementAuth } from "@/application/auth/session";
import { regenerateApiKey } from "@/application/apikeys/apikeys.service";
import { liveApiKeyAuthDeps, liveApiKeyDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import { checkRateLimit, STRICT_TIER } from "@/server/mcp/utils/rate-limit";
import { log } from "@/server/mcp/utils/logger";
import { assertOriginOr403, jsonError, jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const RegenerateBody = z.object({
  id: z.number().int().min(1),
});

/**
 * Revoke-and-reissue: the old secret stops working immediately and the
 * new plaintext is returned once, like creation. Row history (name,
 * expiry, timestamps) is preserved.
 */
export async function POST(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/apikeys", STRICT_TIER);
    const originBlocked = assertOriginOr403(req, id);
    if (originBlocked) return originBlocked;
    const actor = await requireManagementAuth(req, liveApiKeyAuthDeps);
    const body = RegenerateBody.parse(await readJsonBody(req));
    const rotated = await regenerateApiKey(liveApiKeyDeps, body.id);
    if (!rotated) {
      return jsonError("not_found", `API key ${body.id} does not exist.`, 404, id);
    }
    // Audit trail for credential rotation, correlated by request id.
    // The plaintext key itself is never logged.
    log({
      level: "info",
      msg: "apikeys.regenerated",
      requestId: id,
      actor: actor.email ?? `apikey:${actor.apiKey?.id ?? "unknown"}`,
      keyId: rotated.id,
    });
    return jsonOk(rotated, id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
