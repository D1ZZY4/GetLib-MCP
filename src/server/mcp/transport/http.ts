import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { ClientSessionSnapshot } from "@/domain/mcp/catalog";
import { requireManagementAuth, UnauthorizedError } from "@/application/auth/session";
import { checkRateLimit, EXECUTION_TIER, READ_TIER } from "../utils/rate-limit";
import { generateRequestId } from "../utils/guard";
import { createServer } from "../server";
import { assertAllowedOrigin, OriginRejectedError } from "./request-guard";
import { pruneSessionMap } from "./sessions";

interface SessionEntry {
  transport: WebStandardStreamableHTTPServerTransport;
  server: McpServer;
  connectedAt: number;
  lastSeenAt: number;
  userAgent?: string;
}

export interface ClientSession extends ClientSessionSnapshot {
  transport: "streamable-http";
}

// In-memory sessions: correct for dev and long-running Node hosts.
// Serverless deployments need an external session store instead.
// Eviction policy is shared with the SSE transport (sessions.ts).
const sessions = new Map<string, SessionEntry>();

function pruneIdleSessions(now: number = Date.now()): void {
  pruneSessionMap(sessions, now);
}

export function listSessions(): ClientSession[] {
  pruneIdleSessions();
  return [...sessions.entries()].map(([id, entry]) => ({
    id,
    transport: "streamable-http" as const,
    connectedAt: new Date(entry.connectedAt).toISOString(),
    lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
    ...(entry.userAgent !== undefined ? { userAgent: entry.userAgent } : {}),
  }));
}

/** Closes every live Streamable HTTP session. Shutdown path only. */
export async function closeAllHttpSessions(): Promise<void> {
  const entries = [...sessions.values()];
  sessions.clear();
  await Promise.allSettled(
    entries.map(async (entry) => {
      try {
        await entry.transport.close?.();
      } catch {
        // Best-effort cleanup during shutdown.
      }
    }),
  );
}

async function getTransport(req: Request): Promise<WebStandardStreamableHTTPServerTransport> {
  pruneIdleSessions();
  const sessionId = req.headers.get("mcp-session-id");
  if (sessionId !== null) {
    const existing = sessions.get(sessionId);
    if (existing) {
      existing.lastSeenAt = Date.now();
      return existing.transport;
    }
  }

  const server = createServer();
  const now = Date.now();
  // Best-effort client hint from headers. The MCP handshake does not expose
  // the client name to the transport, so this stays an observed hint, never
  // a verified identity.
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    enableJsonResponse: true,
    onsessioninitialized: (id) => {
      sessions.set(id, {
        transport,
        server,
        connectedAt: now,
        lastSeenAt: now,
        ...(userAgent !== undefined ? { userAgent } : {}),
      });
    },
    onsessionclosed: (id) => {
      sessions.delete(id);
    },
  });
  transport.onclose = () => {
    if (transport.sessionId) {
      sessions.delete(transport.sessionId);
    }
  };
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
  const transport = await getTransport(req);
  return transport.handleRequest(req);
}
