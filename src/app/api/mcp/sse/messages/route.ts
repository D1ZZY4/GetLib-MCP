import { UnknownSseSessionError, postSseMessage } from "@/server/mcp/transport/sse";
import {
  jsonError,
  mapRouteError,
  readJsonBody,
  requestId,
} from "@/app/api/_lib/route-helpers";

export async function POST(req: Request) {
  const id = requestId();
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      return jsonError("validation_error", "Missing sessionId query parameter.", 400, id);
    }
    const body = await readJsonBody(req);
    try {
      postSseMessage(sessionId, body);
    } catch (error) {
      if (error instanceof UnknownSseSessionError) {
        return jsonError("not_found", error.message, 404, id);
      }
      if (error instanceof Error) {
        return jsonError("validation_error", error.message, 400, id);
      }
      throw error;
    }
    return new Response(null, { status: 202 });
  } catch (error) {
    return mapRouteError(error, id);
  }
}
