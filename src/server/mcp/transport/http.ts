import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { ClientSessionSnapshot } from "@/domain/mcp/catalog";
import { registerClientLister } from "@/application/clients/clients.service";
import {
  SESSION_SECRET_MISSING_MESSAGE,
  SessionSecretMissingError,
  requireManagementAuth,
  UNAUTHORIZED_MESSAGE,
  UnauthorizedError,
} from "@/application/auth/session";
import { liveApiKeyAuthDeps } from "../infrastructure/deps/apikeys-deps";
import { checkRateLimit, EXECUTION_TIER, READ_TIER, RateLimitError } from "../utils/rate-limit";
import { generateRequestId } from "../utils/guard";
import { createServer } from "../server";
import { assertAllowedOrigin, noteUnexpectedHost, OriginRejectedError } from "./request-guard";

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

// Application-layer aggregation port: the clients service aggregates
// registered listers without importing transport modules.
registerClientLister(listSessions);

/** Clears the recent-clients ring. Shutdown path only. */
export async function closeAllHttpSessions(): Promise<void> {
  recentClients.clear();
}

async function getTransport(): Promise<{
  server: ReturnType<typeof createServer>;
  transport: WebStandardStreamableHTTPServerTransport;
}> {
  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    // No sessionIdGenerator: stateless mode. Each request carries exactly
    // one message and is answered on the same request - no session lookup,
    // no cross-request memory, identical behavior on every instance.
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return { server, transport };
}

export async function handleHttpRequest(req: Request): Promise<Response> {
  const id = generateRequestId();
  noteUnexpectedHost(req);
  try {
    assertAllowedOrigin(req);
  } catch (error) {
    if (error instanceof OriginRejectedError) {
      return errorBody(
        { error: { code: "forbidden", message: error.message, requestId: id } },
        403,
        id,
      );
    }
    throw error;
  }
  try {
    // Writes execute tools - stricter budget. Reads (GET without a session
    // handshake aside) share the polling budget.
    checkRateLimit(req, "mcp/http", req.method === "GET" ? READ_TIER : EXECUTION_TIER);
    await requireManagementAuth(req, liveApiKeyAuthDeps);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return errorBody(
        {
          error: {
            code: "rate_limited",
            message: "Too many requests. Slow down and try again shortly.",
            requestId: id,
          },
        },
        429,
        id,
        { "Retry-After": String(error.retryAfterSeconds) },
      );
    }
    if (error instanceof UnauthorizedError) {
      return errorBody(
        {
          error: {
            code: "unauthorized",
            message: UNAUTHORIZED_MESSAGE,
            requestId: id,
          },
        },
        401,
        id,
      );
    }
    if (error instanceof SessionSecretMissingError) {
      // Fail closed without leaking configuration detail to the client.
      return errorBody(
        {
          error: {
            code: "internal_error",
            message: SESSION_SECRET_MISSING_MESSAGE,
            requestId: id,
          },
        },
        500,
        id,
      );
    }
    throw error;
  }
  const { server, transport } = await getTransport();
  noteHttpClient(req.headers.get("user-agent") ?? undefined);
  try {
    // Correlate successful tool calls like every error path does: the SDK
    // owns the body, but the request id header stays ours.
    const response = await transport.handleRequest(req);
    response.headers.set("X-Request-Id", id);
    return response;
  } finally {
    // Per-request server and transport must not accumulate on long-running
    // hosts. Best-effort cleanup after the single stateless response.
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

function errorBody(
  body: { error: { code: string; message: string; requestId: string } },
  status: number,
  id: string,
  headers?: Record<string, string>,
): Response {
  const response = Response.json(body, { status });
  response.headers.set("X-Request-Id", id);
  if (headers !== undefined) {
    for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  }
  return response;
}
