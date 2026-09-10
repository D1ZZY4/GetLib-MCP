import { z } from "zod";
import { requireManagementAuth } from "@/application/auth/session";
import { executeTool } from "@/application/mcp/mcp-catalog.service";
import { checkRateLimit, EXECUTION_TIER } from "@/server/mcp/utils/rate-limit";
import { toolNameSchema } from "@/server/mcp/utils/schemas";
import { jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const RunBody = z.object({
  tool: toolNameSchema(),
  args: z.unknown().optional(),
});

export async function POST(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/tools/run", EXECUTION_TIER);
    requireManagementAuth(req);
    const body = RunBody.parse(await readJsonBody(req));
    return jsonOk(await executeTool(body.tool, body.args, id), id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
