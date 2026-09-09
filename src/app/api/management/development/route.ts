import { z } from "zod";
import { requireManagementAuth } from "@/application/auth/session";
import {
  getDevelopmentSettings,
  updateDatabaseMode,
} from "@/application/development/development.service";
import { checkRateLimit, EXECUTION_TIER, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const ModeBody = z.object({
  mode: z.enum(["mock", "supabase"]).nullable(),
});

export async function GET(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/development", READ_TIER);
    requireManagementAuth(req);
    return jsonOk(getDevelopmentSettings(), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}

export async function PUT(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/development", EXECUTION_TIER);
    requireManagementAuth(req);
    const body = ModeBody.parse(await readJsonBody(req));
    return jsonOk(updateDatabaseMode(body.mode), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
