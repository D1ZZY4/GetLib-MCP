import { describe, expect, test } from "bun:test";
import {
  UnknownSseSessionError,
  closeSseSession,
  listSseSessions,
  openSseSession,
  postSseMessage,
} from "../transport/sse";

async function readUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  marker: string,
  timeoutMs = 5000,
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (buffer.includes(marker)) return buffer;
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error(`Timed out waiting for ${marker}`);
    const next = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timed out waiting for ${marker}`)), remaining);
      }),
    ]);
    if (next.done) throw new Error(`Stream ended before ${marker}`);
    buffer += decoder.decode(next.value, { stream: true });
  }
}

describe("SSE transport", () => {
  test("handshake emits the endpoint event, then answers initialize", async () => {
    const { sessionId, stream } = await openSseSession();
    const reader = stream.getReader();
    try {
      const handshake = await readUntil(reader, "event: endpoint");
      expect(handshake).toContain(`sessionId=${sessionId}`);

      postSseMessage(sessionId, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "sse-test", version: "0.0.0" },
        },
      });

      const response = await readUntil(reader, '"id":1');
      expect(response).toContain("event: message");
    } finally {
      reader.releaseLock();
    }
  });

  test("unknown sessions and malformed bodies are rejected", () => {
    expect(() => postSseMessage("no-such-session", {})).toThrow(UnknownSseSessionError);
  });

  test("opened sessions resolve to a stable slug=uuid identity", async () => {
    const first = await openSseSession({ userAgent: "opencode/9.9.9-test" });
    const second = await openSseSession({ userAgent: "opencode/9.9.9-test" });
    try {
      const entries = listSseSessions().filter((entry) => entry.name === "opencode");
      expect(entries).toHaveLength(2);
      expect(entries[0]?.id).toBe(entries[1]?.id);
      expect(entries[0]?.id).toMatch(/^opencode=[0-9a-f-]{36}$/);
      expect(entries[0]?.version).toBe("9.9.9-test");
      expect(entries[0]?.authType).toBe("anonymous");
    } finally {
      closeSseSession(first.sessionId);
      closeSseSession(second.sessionId);
    }
  });

  test("prompts/list answers over the SSE stream with all six prompts", async () => {
    const { sessionId, stream } = await openSseSession();
    const reader = stream.getReader();
    try {
      await readUntil(reader, "event: endpoint");
      postSseMessage(sessionId, {
        jsonrpc: "2.0",
        id: 21,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "sse-prompts-test", version: "0.0.0" },
        },
      });
      await readUntil(reader, '"id":21');
      postSseMessage(sessionId, { jsonrpc: "2.0", id: 22, method: "prompts/list", params: {} });
      const response = await readUntil(reader, '"id":22');
      for (const name of ["review-libraries", "get-docs", "best-practices", "migrate-library", "audit-project", "compare-libraries"]) {
        expect(response).toContain(name);
      }
    } finally {
      reader.releaseLock();
    }
  });

  test("prompts/get renders over the SSE stream without crashing", async () => {
    const { sessionId, stream } = await openSseSession();
    const reader = stream.getReader();
    try {
      await readUntil(reader, "event: endpoint");
      postSseMessage(sessionId, {
        jsonrpc: "2.0",
        id: 31,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "sse-prompts-get-test", version: "0.0.0" },
        },
      });
      await readUntil(reader, '"id":31');
      postSseMessage(sessionId, {
        jsonrpc: "2.0",
        id: 32,
        method: "prompts/get",
        params: { name: "get-docs", arguments: { libraryId: "facebook/react", topic: "hooks" } },
      });
      const response = await readUntil(reader, '"id":32');
      expect(response).toContain("facebook/react");
    } finally {
      reader.releaseLock();
    }
  });
});
