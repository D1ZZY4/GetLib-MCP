import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "../server";

interface SessionEntry {
  transport: WebStandardStreamableHTTPServerTransport;
  server: McpServer;
  connectedAt: number;
  lastSeenAt: number;
}

export interface ClientSession {
  id: string;
  transport: "streamable-http";
  connectedAt: string;
  lastSeenAt: string;
}

// In-memory sessions: correct for dev and long-running Node hosts.
// Serverless deployments need an external session store instead.
const sessions = new Map<string, SessionEntry>();

export function listSessions(): ClientSession[] {
  return [...sessions.entries()].map(([id, entry]) => ({
    id,
    transport: "streamable-http" as const,
    connectedAt: new Date(entry.connectedAt).toISOString(),
    lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
  }));
}

async function getTransport(req: Request): Promise<WebStandardStreamableHTTPServerTransport> {
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
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    enableJsonResponse: true,
    onsessioninitialized: (id) => {
      sessions.set(id, { transport, server, connectedAt: now, lastSeenAt: now });
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
  const transport = await getTransport(req);
  return transport.handleRequest(req);
}
