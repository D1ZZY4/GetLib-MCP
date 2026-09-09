import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage, MessageExtraInfo } from "@modelcontextprotocol/sdk/types.js";
import { JSONRPCMessageSchema } from "@modelcontextprotocol/sdk/types.js";
import type { ClientSessionSnapshot } from "@/domain/mcp/catalog";
import { createServer } from "../server";
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
  connectedAt: number;
  lastSeenAt: number;
}

const sessions = new Map<string, SseSession>();

export class UnknownSseSessionError extends Error {
  constructor() {
    super("Unknown SSE session. Open GET /api/mcp/sse first.");
    this.name = "UnknownSseSessionError";
  }
}

function getSession(sessionId: string): SseSession {
  pruneSessionMap(sessions);
  const session = sessions.get(sessionId);
  if (!session) {
    throw new UnknownSseSessionError();
  }
  session.lastSeenAt = Date.now();
  return session;
}

/** Opens a session: connects a fresh MCP server to a new SSE stream. */
export async function openSseSession(): Promise<{ sessionId: string; stream: ReadableStream<Uint8Array> }> {
  pruneSessionMap(sessions);
  const sessionId = crypto.randomUUID();
  const server = createServer();
  const transport = new WebSseTransport(sessionId);
  const now = Date.now();
  sessions.set(sessionId, { transport, server, connectedAt: now, lastSeenAt: now });
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
    }),
  );
}

export interface SseClientSession extends ClientSessionSnapshot {
  transport: "sse";
}

/** Snapshot of live SSE sessions for the clients control plane. */
export function listSseSessions(): SseClientSession[] {
  pruneSessionMap(sessions);
  return [...sessions.entries()].map(([id, entry]) => ({
    id,
    transport: "sse" as const,
    connectedAt: new Date(entry.connectedAt).toISOString(),
    lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
  }));
}
