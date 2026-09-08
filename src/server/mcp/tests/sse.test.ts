import { describe, expect, test } from "bun:test";
import {
  UnknownSseSessionError,
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
});
