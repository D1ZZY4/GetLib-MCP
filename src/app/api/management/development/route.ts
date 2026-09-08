import { z } from "zod";
import {
  getDevelopmentSettings,
  updateDatabaseMode,
} from "@/application/development/development.service";
import { jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const ModeBody = z.object({
  mode: z.enum(["mock", "supabase"]).nullable(),
});

export async function GET() {
  const id = requestId();
  try {
    return jsonOk(getDevelopmentSettings());
  } catch (error) {
    return mapRouteError(error, id);
  }
}

export async function PUT(req: Request) {
  const id = requestId();
  try {
    const body = ModeBody.parse(await readJsonBody(req));
    return jsonOk(updateDatabaseMode(body.mode));
  } catch (error) {
    return mapRouteError(error, id);
  }
}
