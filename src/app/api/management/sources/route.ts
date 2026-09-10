import { z } from "zod";
import { requireManagementAuth } from "@/application/auth/session";
import { liveApiKeyAuthDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import { getSourcesSnapshot, updateSourcesSettings } from "@/application/sources/sources.service";
import { liveSourcesDeps } from "@/server/mcp/infrastructure/deps/sources-deps";
import { checkRateLimit, EXECUTION_TIER, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { nonBlankString } from "@/server/mcp/utils/schemas";
import { jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const SettingsBody = z.object({
  disabled: z.array(nonBlankString(64)).max(32).optional(),
  blocked: z.array(nonBlankString(200)).max(200).optional(),
  wildcards: z.array(nonBlankString(200)).max(200).optional(),
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
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    const body = SettingsBody.parse(await readJsonBody(req));
    return jsonOk(await updateSourcesSettings(liveSourcesDeps, body), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
