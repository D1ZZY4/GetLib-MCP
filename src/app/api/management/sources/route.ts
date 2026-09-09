import { z } from "zod";
import { requireManagementAuth } from "@/application/auth/session";
import { getSourcesSnapshot, updateSourcesSettings } from "@/application/sources/sources.service";
import { checkRateLimit, EXECUTION_TIER, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const SettingsBody = z.object({
  disabled: z.array(z.string().min(1).max(64)).max(32).optional(),
  blocked: z.array(z.string().min(1).max(200)).max(200).optional(),
  wildcards: z.array(z.string().min(1).max(200)).max(200).optional(),
});

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/sources", READ_TIER);
    requireManagementAuth(req);
    return jsonOk(getSourcesSnapshot(), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}

export async function PUT(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/sources", EXECUTION_TIER);
    requireManagementAuth(req);
    const body = SettingsBody.parse(await readJsonBody(req));
    return jsonOk(await updateSourcesSettings(body), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
