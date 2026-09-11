import { z } from "zod";
import { requireManagementAuth } from "@/application/auth/session";
import {
  API_KEY_NAME_MAX,
  createApiKey,
  deleteApiKey,
  listApiKeys,
  renameApiKey,
} from "@/application/apikeys/apikeys.service";
import { liveApiKeyAuthDeps, liveApiKeyDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import { checkRateLimit, READ_TIER, STRICT_TIER } from "@/server/mcp/utils/rate-limit";
import { log } from "@/server/mcp/utils/logger";
import { assertOriginOr403, jsonCreated, jsonError, jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const CreateBody = z.object({
  // Optional: blank or absent names are platform-generated (key-a1b2c3).
  name: z.string().max(API_KEY_NAME_MAX).optional(),
  // Optional ISO-8601 expiry; absent means the key never expires.
  expiresAt: z.string().optional(),
});

const DeleteBody = z.object({
  id: z.number().int().min(1),
});

const RenameBody = z.object({
  id: z.number().int().min(1),
  // Optional: blank or absent names are platform-generated.
  name: z.string().max(API_KEY_NAME_MAX).optional(),
});

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/apikeys", READ_TIER);
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    return jsonOk({ keys: await listApiKeys(liveApiKeyDeps) }, id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}

export async function POST(req: Request) {
  const id = requestId();
  try {
    // Credential issuance and deletion share the strict signin budget:
    // both write security state and must resist enumeration/fill.
    checkRateLimit(req, "management/apikeys", STRICT_TIER);
    const originBlocked = assertOriginOr403(req, id);
    if (originBlocked) return originBlocked;
    const actor = await requireManagementAuth(req, liveApiKeyAuthDeps);
    const body = CreateBody.parse(await readJsonBody(req));
    const created = await createApiKey(liveApiKeyDeps, body.name, body.expiresAt);
    // Audit trail for credential issuance: who created which key name,
    // correlated by request id. The plaintext key itself is never logged.
    log({
      level: "info",
      msg: "apikeys.created",
      requestId: id,
      actor: actor.email ?? `apikey:${actor.apiKey?.id ?? "unknown"}`,
      keyId: created.id,
      name: created.name,
    });
    return jsonCreated(created, id);
  } catch (error) {
    // ApiKeyValidationError maps to 422 inside mapRouteError - no local
    // branch so the status mapping lives in exactly one place.
    return mapRouteError(error, id);
  }
}

export async function PATCH(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/apikeys", STRICT_TIER);
    const originBlocked = assertOriginOr403(req, id);
    if (originBlocked) return originBlocked;
    const actor = await requireManagementAuth(req, liveApiKeyAuthDeps);
    const body = RenameBody.parse(await readJsonBody(req));
    const renamed = await renameApiKey(liveApiKeyDeps, body.id, body.name);
    if (!renamed) {
      return jsonError("not_found", `API key ${body.id} does not exist.`, 404, id);
    }
    log({
      level: "info",
      msg: "apikeys.renamed",
      requestId: id,
      actor: actor.email ?? `apikey:${actor.apiKey?.id ?? "unknown"}`,
      keyId: body.id,
    });
    return jsonOk({ renamed: body.id }, id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}

export async function DELETE(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/apikeys", STRICT_TIER);
    const originBlocked = assertOriginOr403(req, id);
    if (originBlocked) return originBlocked;
    const actor = await requireManagementAuth(req, liveApiKeyAuthDeps);
    const body = DeleteBody.parse(await readJsonBody(req));
    const deleted = await deleteApiKey(liveApiKeyDeps, body.id);
    if (!deleted) {
      return jsonError("not_found", `API key ${body.id} does not exist.`, 404, id);
    }
    // Audit trail for credential revocation, correlated by request id.
    log({
      level: "info",
      msg: "apikeys.deleted",
      requestId: id,
      actor: actor.email ?? `apikey:${actor.apiKey?.id ?? "unknown"}`,
      keyId: body.id,
    });
    return jsonOk({ deleted: body.id }, id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
