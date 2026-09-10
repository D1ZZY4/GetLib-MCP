import { z } from "zod";
import { requireManagementAuth } from "@/application/auth/session";
import {
  ApiKeyValidationError,
  API_KEY_NAME_MAX,
  createApiKey,
  deleteApiKey,
  listApiKeys,
} from "@/application/apikeys/apikeys.service";
import { liveApiKeyAuthDeps, liveApiKeyDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import { checkRateLimit, READ_TIER, STRICT_TIER } from "@/server/mcp/utils/rate-limit";
import { nonBlankString } from "@/server/mcp/utils/schemas";
import { jsonError, jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const CreateBody = z.object({
  name: nonBlankString(API_KEY_NAME_MAX),
});

const DeleteBody = z.object({
  id: z.number().int().min(1),
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
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    const body = CreateBody.parse(await readJsonBody(req));
    return jsonOk(await createApiKey(liveApiKeyDeps, body.name), id);
  } catch (error) {
    if (error instanceof ApiKeyValidationError) {
      return jsonError("validation_error", error.message, 422, id);
    }
    return mapRouteError(error, id);
  }
}

export async function DELETE(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/apikeys", STRICT_TIER);
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    const body = DeleteBody.parse(await readJsonBody(req));
    const deleted = await deleteApiKey(liveApiKeyDeps, body.id);
    if (!deleted) {
      return jsonError("not_found", `API key ${body.id} does not exist.`, 404, id);
    }
    return jsonOk({ deleted: body.id }, id);
  } catch (error) {
    if (error instanceof ApiKeyValidationError) {
      return jsonError("validation_error", error.message, 422, id);
    }
    return mapRouteError(error, id);
  }
}
