import { closeSseSession, openSseSession } from "@/server/mcp/transport/sse";
import { requireManagementAuth } from "@/application/auth/session";
import { liveApiKeyAuthDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import { checkRateLimit, EXECUTION_TIER } from "@/server/mcp/utils/rate-limit";
import { assertOriginOr403, mapRouteError, requestId } from "@/app/api/_lib/route-helpers";
import { noteUnexpectedHost } from "@/server/mcp/transport/request-guard";

export async function GET(req: Request) {
  const id = requestId();
  try {
    noteUnexpectedHost(req);
    const originRejection = assertOriginOr403(req, id);
    if (originRejection) return originRejection;
    // Opening a session allocates server-side state, so it shares the
    // execution budget rather than the read budget.
    checkRateLimit(req, "mcp/sse", EXECUTION_TIER);
    const auth = await requireManagementAuth(req, liveApiKeyAuthDeps);
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const { sessionId, stream } = await openSseSession({
      ...(userAgent !== undefined ? { userAgent } : {}),
      ...(auth.apiKey !== undefined
        ? { apiKeyName: auth.apiKey.name, apiKeyId: auth.apiKey.id }
        : {}),
      ...(auth.apiKey === undefined && auth.email !== null ? { sessionEmail: auth.email } : {}),
    });
    req.signal.addEventListener("abort", () => {
      closeSseSession(sessionId);
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Request-Id": id,
      },
    });
  } catch (error) {
    return mapRouteError(error, id);
  }
}
