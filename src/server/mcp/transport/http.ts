import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { ClientSessionSnapshot } from "@/domain/mcp/catalog";
import { requireManagementAuth, UnauthorizedError } from "@/application/auth/session";
import { checkRateLimit, EXECUTION_TIER, READ_TIER } from "../utils/rate-limit";
import { generateRequestId } from "../utils/guard";
import { createServer } from "../server";
import { assertAllowedOrigin, OriginRejectedError } from "./request-guard";

export interface ClientSession extends ClientSessionSnapshot {
  transport: "streamable-http";
}

// Stateless Streamable HTTP: every request gets a fresh server and
// transport (SDK stateless mode, no sessionIdGenerator), so any instance -
// long-running or serverless - answers identically. Stateful in-memory
// sessions cannot work here: serverless isolates and parallel instances do
// not share memory, so a session created by one request is invisible to the
// next and every post-initialize call fails with "Server not initialized".
// What the dashboard shows instead is a bounded ring of recently seen
// clients (user-agent + last-seen), which is honest on every host.
interface RecentClient {
  userAgent: string;
  firstSeenAt: number;
  lastSeenAt: number;
  requestCount: number;
}

const MAX_RECENT_CLIENTS = 100;

const recentClients = new Map<string, RecentClient>();

function noteHttpClient(userAgent: string | undefined): void {
  const key = userAgent ?? "unknown";
  const now = Date.now();
  const existing = recentClients.get(key);
  if (existing) {
    existing.lastSeenAt = now;
    existing.requestCount += 1;
    return;
  }
  if (recentClients.size >= MAX_RECENT_CLIENTS) {
    const oldest = recentClients.keys().next().value;
    if (oldest !== undefined) recentClients.delete(oldest);
  }
  recentClients.set(key, { userAgent: key, firstSeenAt: now, lastSeenAt: now, requestCount: 1 });
}

export function listSessions(): ClientSession[] {
  return [...recentClients.values()].map((entry) => ({
    id: entry.userAgent,
    transport: "streamable-http" as const,
    connectedAt: new Date(entry.firstSeenAt).toISOString(),
    lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
    ...(entry.userAgent !== "unknown" ? { userAgent: entry.userAgent } : {}),
  }));
}

/** Clears the recent-clients ring. Shutdown path only. */
export async function closeAllHttpSessions(): Promise<void> {
  recentClients.clear();
}

async function getTransport(): Promise<WebStandardStreamableHTTPServerTransport> {
  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    // No sessionIdGenerator: stateless mode. Each request carries exactly
    // one message and is answered on the same request - no session lookup,
    // no cross-request memory, identical behavior on every instance.
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport;
}

export async function handleHttpRequest(req: Request): Promise<Response> {
  try {
    assertAllowedOrigin(req);
  } catch (error) {
    if (error instanceof OriginRejectedError) {
      return Response.json({ error: { code: "forbidden", message: error.message } }, { status: 403 });
    }
    throw error;
  }
  // Writes execute tools - stricter budget. Reads (GET without a session
  // handshake aside) share the polling budget.
  checkRateLimit(req, "mcp/http", req.method === "GET" ? READ_TIER : EXECUTION_TIER);
  try {
    requireManagementAuth(req);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const id = generateRequestId();
      const response = Response.json(
        { error: { code: "unauthorized", message: "Authentication is required for this endpoint.", requestId: id } },
        { status: 401 },
      );
      response.headers.set("X-Request-Id", id);
      return response;
    }
    throw error;
  }
  const transport = await getTransport();
  noteHttpClient(req.headers.get("user-agent") ?? undefined);
  return transport.handleRequest(req);
}
