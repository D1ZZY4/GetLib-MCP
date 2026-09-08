import { z } from "zod";
import { getSourcesSnapshot, updateSourcesSettings } from "@/application/sources/sources.service";
import { jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const SettingsBody = z.object({
  disabled: z.array(z.string().min(1).max(64)).max(32).optional(),
  blocked: z.array(z.string().min(1).max(200)).max(200).optional(),
  wildcards: z.array(z.string().min(1).max(200)).max(200).optional(),
});

export async function GET() {
  const id = requestId();
  try {
    return jsonOk(getSourcesSnapshot());
  } catch (error) {
    return mapRouteError(error, id);
  }
}

export async function PUT(req: Request) {
  const id = requestId();
  try {
    const body = SettingsBody.parse(await readJsonBody(req));
    return jsonOk(await updateSourcesSettings(body));
  } catch (error) {
    return mapRouteError(error, id);
  }
}
