import { closeSseSession, openSseSession } from "@/server/mcp/transport/sse";
import { OriginRejectedError, assertAllowedOrigin } from "@/server/mcp/transport/request-guard";
import { requireManagementAuth } from "@/application/auth/session";
import { checkRateLimit, READ_TIER } from "@/server/mcp/utils/rate-limit";
import { jsonError, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
    try {
      assertAllowedOrigin(req);
    } catch (error) {
      if (error instanceof OriginRejectedError) {
        return jsonError("forbidden", error.message, 403, id);
      }
      throw error;
    }
    checkRateLimit(req, "mcp/sse", READ_TIER);
    requireManagementAuth(req);
    const { sessionId, stream } = await openSseSession();
    req.signal.addEventListener("abort", () => {
      closeSseSession(sessionId);
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return mapRouteError(error, id);
  }
}
