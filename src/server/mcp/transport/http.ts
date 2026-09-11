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
import { getDatabase } from "../infrastructure/database";
import { identifyClient } from "../services/client-identity";
import { log } from "../utils/logger";
import { afterWork } from "../utils/after-work";
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
// clients keyed by stable `<slug>=<uuid>` identity (user-agent, session
// account, or API key name) plus a durable row in `mcp_clients`, which is
// honest on every host including serverless.
interface RecentClient {
  id: string;
  name: string;
  version?: string;
  authType: "anonymous" | "api_key" | "session";
  userAgent: string;
  firstSeenAt: number;
  lastSeenAt: number;
  requestCount: number;
}

const MAX_RECENT_CLIENTS = 100;

const recentClients = new Map<string, RecentClient>();

function noteHttpClient(
  userAgent: string | undefined,
  auth: { email: string | null; apiKey?: { id: number; name: string } },
): void {
  const identity = identifyClient({
    transport: "streamable-http",
    ...(userAgent !== undefined ? { userAgent } : {}),
    ...(auth.apiKey !== undefined
      ? { apiKeyName: auth.apiKey.name, apiKeyId: auth.apiKey.id }
      : {}),
    ...(auth.apiKey === undefined && auth.email !== null ? { sessionEmail: auth.email } : {}),
  });
  const key = identity.id;
  const now = Date.now();
  const existing = recentClients.get(key);
  if (existing) {
    existing.lastSeenAt = now;
    existing.requestCount += 1;
    existing.name = identity.name;
    if (identity.version !== undefined) existing.version = identity.version;
    if (identity.userAgent !== undefined) existing.userAgent = identity.userAgent;
    existing.authType = identity.authType;
  } else {
    if (recentClients.size >= MAX_RECENT_CLIENTS) {
      const oldest = recentClients.keys().next().value;
      if (oldest !== undefined) recentClients.delete(oldest);
    }
    recentClients.set(key, {
      id: identity.id,
      name: identity.name,
      ...(identity.version !== undefined ? { version: identity.version } : {}),
      authType: identity.authType,
      userAgent: userAgent ?? "unknown",
      firstSeenAt: now,
      lastSeenAt: now,
      requestCount: 1,
    });
  }
  // Durable sighting, best-effort: transport observation must never fail
  // the request it observes. afterWork keeps the write alive past the
  // response on serverless hosts (a bare floating promise freezes with
  // the process and its orphaned timer then misreports a timeout).
  // Failures stay in the server log and the write-health tracker only.
  afterWork(() => {
    try {
      void getDatabase()
        .touchClient({
          id: identity.id,
          name: identity.name,
          ...(identity.version !== undefined ? { clientVersion: identity.version } : {}),
          transport: "streamable-http",
          ...(identity.userAgent !== undefined ? { userAgent: identity.userAgent } : {}),
          ...(identity.apiKeyId !== undefined ? { apiKeyId: identity.apiKeyId } : {}),
          authType: identity.authType,
        })
        .catch((error: unknown) => {
          log({ level: "debug", msg: "http.client.persist-failed", error: String(error) });
        });
    } catch (error) {
      log({ level: "debug", msg: "http.client.persist-failed", error: String(error) });
    }
  });
}

export function listSessions(): ClientSession[] {
  return [...recentClients.values()].map((entry) => ({
    id: entry.id,
    name: entry.name,
    ...(entry.version !== undefined ? { version: entry.version } : {}),
    authType: entry.authType,
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
  let authContext: { email: string | null; apiKey?: { id: number; name: string } };
  try {
    // Writes execute tools - stricter budget. Reads (GET without a session
    // handshake aside) share the polling budget.
    checkRateLimit(req, "mcp/http", req.method === "GET" ? READ_TIER : EXECUTION_TIER);
    authContext = await requireManagementAuth(req, liveApiKeyAuthDeps);
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
  noteHttpClient(req.headers.get("user-agent") ?? undefined, authContext);
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
