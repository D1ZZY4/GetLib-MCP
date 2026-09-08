import { closeSseSession, openSseSession } from "@/server/mcp/transport/sse";
import { mapRouteError, requestId } from "@/app/api/_lib/route-helpers";

export async function GET(req: Request) {
  const id = requestId();
  try {
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
