import { z } from "zod";
import { requireManagementAuth } from "@/application/auth/session";
import { liveApiKeyAuthDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import { getSourcesSnapshot, updateSourcesSettings } from "@/application/sources/sources.service";
import { liveSourcesDeps } from "@/server/mcp/infrastructure/deps/sources-deps";
import { checkRateLimit, EXECUTION_TIER, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { nonBlankString } from "@/server/mcp/utils/schemas";
import { assertOriginOr403, jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const SOURCE_NAME_MAX = 64;
const SOURCE_LIST_MAX = 32;
const SOURCE_PATTERN_MAX = 200;
const SOURCE_PATTERNS_MAX = 200;

const SettingsBody = z.object({
  disabled: z.array(nonBlankString(SOURCE_NAME_MAX)).max(SOURCE_LIST_MAX).optional(),
  blocked: z.array(nonBlankString(SOURCE_PATTERN_MAX)).max(SOURCE_PATTERNS_MAX).optional(),
  wildcards: z.array(nonBlankString(SOURCE_PATTERN_MAX)).max(SOURCE_PATTERNS_MAX).optional(),
});

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/sources", READ_TIER);
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    return jsonOk(getSourcesSnapshot(liveSourcesDeps), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}

export async function PUT(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/sources", EXECUTION_TIER);
    const originBlocked = assertOriginOr403(req, id);
    if (originBlocked) return originBlocked;
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    const body = SettingsBody.parse(await readJsonBody(req));
    return jsonOk(await updateSourcesSettings(liveSourcesDeps, body), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
