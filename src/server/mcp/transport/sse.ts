import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage, MessageExtraInfo } from "@modelcontextprotocol/sdk/types.js";
import { JSONRPCMessageSchema } from "@modelcontextprotocol/sdk/types.js";
import type { ClientSessionSnapshot } from "@/domain/mcp/catalog";
import { registerClientLister } from "@/application/clients/clients.service";
import { createServer } from "../server";
import { getRuntimeSnapshot } from "../runtime";
import { getDatabase } from "../infrastructure/database";
import { identifyClient, type ClientIdentity } from "../services/client-identity";
import { afterWork } from "../utils/after-work";
import { log } from "../utils/logger";
import { pruneSessionMap } from "./sessions";

/**
 * Server-Sent Events transport over Web Streams (App Router compatible).
 *
 * Legacy SSE flow: GET opens an event stream that first emits an `endpoint`
 * event telling the client where to POST JSON-RPC messages; each POST is
 * answered 202 while the actual response arrives as a `message` event on
 * the stream. Thin protocol adapter only - capability logic lives in the
 * registry and application services.
 */

export const SSE_MESSAGE_PATH = "/api/mcp/sse/messages";

const encoder = new TextEncoder();

function sseFrame(event: string, data: string): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${data}\n\n`);
}

export class WebSseTransport implements Transport {
  sessionId?: string;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: <T extends JSONRPCMessage>(message: T, extra?: MessageExtraInfo) => void;

  readonly stream: ReadableStream<Uint8Array>;
  private controller?: ReadableStreamDefaultController<Uint8Array>;
  private closed = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
      },
      cancel: () => {
        void this.close();
      },
    });
  }

  async start(): Promise<void> {
    this.push(
      sseFrame("endpoint", `${SSE_MESSAGE_PATH}?sessionId=${encodeURIComponent(this.sessionId ?? "")}`),
    );
  }

  async send(message: JSONRPCMessage): Promise<void> {
    this.push(sseFrame("message", JSON.stringify(message)));
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      this.controller?.close();
    } catch {
      // Stream already closed or errored - nothing left to clean up.
    }
    this.onclose?.();
  }

  /** Feeds one client POST body into the MCP server. Throws on malformed input. */
  handleMessage(raw: unknown): void {
    if (this.closed) {
      throw new Error("SSE session is closed.");
    }
    const parsed = JSONRPCMessageSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Request body must be a valid JSON-RPC message.");
    }
    this.onmessage?.(parsed.data);
  }

  private push(chunk: Uint8Array): void {
    if (this.closed) return;
    try {
      this.controller?.enqueue(chunk);
    } catch (error) {
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
      void this.close();
    }
  }
}

interface SseSession {
  transport: WebSseTransport;
  server: McpServer;
  identity: ClientIdentity;
  connectedAt: number;
  lastSeenAt: number;
}

/** Best-effort durable sighting: observation must never fail the session. */
function persistSighting(identity: ClientIdentity): void {
  // afterWork keeps the write alive past the response on serverless
  // hosts; see the extended note at the http.ts call site.
  afterWork(() => {
    try {
      void getDatabase()
        .touchClient({
          id: identity.id,
          name: identity.name,
          ...(identity.version !== undefined ? { clientVersion: identity.version } : {}),
          transport: "sse",
          ...(identity.userAgent !== undefined ? { userAgent: identity.userAgent } : {}),
          ...(identity.apiKeyId !== undefined ? { apiKeyId: identity.apiKeyId } : {}),
          authType: identity.authType,
        })
        .catch((error: unknown) => {
          log({ level: "debug", msg: "sse.client.persist-failed", error: String(error) });
        });
    } catch (error) {
      log({ level: "debug", msg: "sse.client.persist-failed", error: String(error) });
    }
  });
}

const sessions = new Map<string, SseSession>();

let sseVercelWarned = false;

export class UnknownSseSessionError extends Error {
  constructor() {
    super("Unknown SSE session. Open GET /api/mcp/sse first.");
    this.name = "UnknownSseSessionError";
  }
}

function closeEvicted(entries: SseSession[]): void {
  for (const entry of entries) {
    // Pruned sessions never fired their close hook - release the stream
    // and server here so idle eviction cannot leak connections.
    void entry.transport.close().catch(() => undefined);
    void entry.server.close().catch(() => undefined);
  }
}

function getSession(sessionId: string): SseSession {
  closeEvicted(pruneSessionMap(sessions));
  const session = sessions.get(sessionId);
  if (!session) {
    throw new UnknownSseSessionError();
  }
  session.lastSeenAt = Date.now();
  return session;
}

export interface OpenSseSessionOptions {
  userAgent?: string;
  apiKeyName?: string;
  apiKeyId?: number;
  sessionEmail?: string;
}

/** Opens a session: connects a fresh MCP server to a new SSE stream. */
export async function openSseSession(
  options: OpenSseSessionOptions = {},
): Promise<{ sessionId: string; stream: ReadableStream<Uint8Array> }> {
  closeEvicted(pruneSessionMap(sessions));
  if (getRuntimeSnapshot().vercelEnv !== undefined && !sseVercelWarned) {
    sseVercelWarned = true;
    log({
      level: "warn",
      msg: "sse.serverless-sessions",
      detail:
        "SSE sessions live in process memory and need a sticky long-running host. Prefer Streamable HTTP on Vercel.",
    });
  }
  const sessionId = crypto.randomUUID();
  const identity = identifyClient({
    transport: "sse",
    ...(options.userAgent !== undefined ? { userAgent: options.userAgent } : {}),
    ...(options.apiKeyName !== undefined ? { apiKeyName: options.apiKeyName } : {}),
    ...(options.apiKeyId !== undefined ? { apiKeyId: options.apiKeyId } : {}),
    ...(options.sessionEmail !== undefined ? { sessionEmail: options.sessionEmail } : {}),
  });
  const server = createServer();
  const transport = new WebSseTransport(sessionId);
  const now = Date.now();
  sessions.set(sessionId, { transport, server, identity, connectedAt: now, lastSeenAt: now });
  persistSighting(identity);
  transport.onclose = () => {
    sessions.delete(sessionId);
  };
  await server.connect(transport);
  return { sessionId, stream: transport.stream };
}

/** Delivers one client POST body to its session. */
export function postSseMessage(sessionId: string, body: unknown): void {
  getSession(sessionId).transport.handleMessage(body);
}

/** Closes a session early (client disconnect without closing the stream). */
export function closeSseSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    sessions.delete(sessionId);
    void session.transport.close();
    void session.server.close().catch(() => undefined);
  }
}

/** Closes every live SSE session. Shutdown path only. */
export async function closeAllSseSessions(): Promise<void> {
  const entries = [...sessions.values()];
  sessions.clear();
  await Promise.allSettled(
    entries.map(async (entry) => {
      try {
        await entry.transport.close();
      } catch {
        // Best-effort cleanup during shutdown.
      }
      try {
        await entry.server.close();
      } catch {
        // Best-effort cleanup during shutdown.
      }
    }),
  );
}

export interface SseClientSession extends ClientSessionSnapshot {
  transport: "sse";
}

/** Snapshot of live SSE sessions for the clients control plane. */
export function listSseSessions(): SseClientSession[] {
  closeEvicted(pruneSessionMap(sessions));
  return [...sessions.values()].map((entry) => ({
    id: entry.identity.id,
    transport: "sse" as const,
    connectedAt: new Date(entry.connectedAt).toISOString(),
    lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
    ...(entry.identity.userAgent !== undefined ? { userAgent: entry.identity.userAgent } : {}),
    name: entry.identity.name,
    ...(entry.identity.version !== undefined ? { version: entry.identity.version } : {}),
    authType: entry.identity.authType,
  }));
}

// Application-layer aggregation port: the clients service aggregates
// registered listers without importing transport modules.
registerClientLister(listSseSessions);
