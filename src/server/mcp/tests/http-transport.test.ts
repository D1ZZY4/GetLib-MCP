import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resetConfigOverride, setConfigOverride } from "../config";
import { handleHttpRequest, listSessions } from "../transport/http";
import { EXECUTION_TIER, checkRateLimit, resetRateLimits } from "../utils/rate-limit";

// Transport behavior is tested with authentication disabled so the suite
// stays independent of the operator .env. The auth boundary itself is
// covered by the session tests.
beforeEach(() => {
  setConfigOverride({ authEnabled: false });
});

afterEach(() => {
  resetConfigOverride();
});

const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

function post(body: unknown, extraHeaders: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/mcp/http", {
    method: "POST",
    headers: { ...HEADERS, ...extraHeaders },
    body: JSON.stringify(body),
  });
}

function initialize(id: number | string): Request {
  return post({
    jsonrpc: "2.0",
    id,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "http-transport-test", version: "0.0.0" },
    },
  });
}

/**
 * Regression test for the total-outage failure mode: on serverless hosts
 * every request can land on a fresh isolate with empty memory, so each
 * request must succeed on a fresh transport with no shared session state.
 * Previously every post-initialize call failed with
 * "Bad Request: Server not initialized" (-32000).
 */
describe("Streamable HTTP stateless transport", () => {
  test("initialize then tools/list then tools/call succeed with no shared state", async () => {
    const initRes = await handleHttpRequest(initialize(1));
    expect(initRes.status).toBe(200);
    const initBody = (await initRes.json()) as {
      result?: { serverInfo?: { name?: string } };
    };
    expect(initBody.result?.serverInfo?.name).toBe("getlib-mcp");

    const listRes = await handleHttpRequest(
      post({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    );
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as { result?: { tools?: Array<{ name: string }> } };
    const names = listBody.result?.tools?.map((tool) => tool.name) ?? [];
    expect(names).toContain("gl_search");

    const callRes = await handleHttpRequest(
      post({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "gl_dispatch", arguments: { query: "use getlib for react" } },
      }),
    );
    expect(callRes.status).toBe(200);
    const callBody = (await callRes.json()) as { result?: { content?: unknown } };
    expect(callBody.result?.content).toBeDefined();
  });

  test("unknown tool call returns a tool error, not a transport error", async () => {
    const res = await handleHttpRequest(
      post({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "gl_nope", arguments: {} },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result?: { isError?: boolean; content?: Array<{ text?: string }> };
    };
    expect(body.result?.isError).toBe(true);
    const text = JSON.stringify(body.result?.content ?? "");
    expect(text).not.toContain("not initialized");
  });

  test("recent clients ring observes traffic without sessions", async () => {
    await handleHttpRequest(initialize("ring-probe"));
    const sessions = listSessions();
    expect(Array.isArray(sessions)).toBe(true);
  });

  test("resources/list and prompts/list work on a fresh transport", async () => {
    const res = await handleHttpRequest(
      post({ jsonrpc: "2.0", id: 10, method: "resources/list", params: {} }),
    );
    expect(res.status).toBe(200);
    const resBody = (await res.json()) as { result?: { resources?: Array<{ uri: string }> } };
    const uris = resBody.result?.resources?.map((r) => r.uri) ?? [];
    expect(uris).toContain("getlib://libraries");
    expect(uris).toContain("getlib://stats");

    const prompts = await handleHttpRequest(
      post({ jsonrpc: "2.0", id: 11, method: "prompts/list", params: {} }),
    );
    expect(prompts.status).toBe(200);
    const promptsBody = (await prompts.json()) as { result?: { prompts?: Array<{ name: string }> } };
    expect((promptsBody.result?.prompts ?? []).length).toBeGreaterThan(0);
  });

  test("invalid tool args return a tool error, not a transport error", async () => {
    const res = await handleHttpRequest(
      post({
        jsonrpc: "2.0",
        id: 12,
        method: "tools/call",
        params: { name: "gl_search", arguments: { query: "" } },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result?: { isError?: boolean; content?: Array<{ text?: string }> };
    };
    expect(body.result?.isError).toBe(true);
    const text = JSON.stringify(body.result?.content ?? "");
    expect(text).not.toContain("not initialized");
  });

  test("exhausted rate budget returns 429 with retry headers, not 500", async () => {
    const identity = "http-429-regression-client";
    const scoped = (id: number | string) =>
      post(
        { jsonrpc: "2.0", id, method: "tools/list", params: {} },
        { "x-forwarded-for": identity },
      );
    try {
      for (let i = 0; i < EXECUTION_TIER.limit; i++) {
        checkRateLimit(scoped(`warm-${i}`), "mcp/http", EXECUTION_TIER);
      }
      const res = await handleHttpRequest(scoped("over-budget"));
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe(String(Math.ceil(EXECUTION_TIER.windowMs / 1000)));
      expect(res.headers.get("X-Request-Id")).toBeTruthy();
      const body = (await res.json()) as { error?: { code?: string; requestId?: string } };
      expect(body.error?.code).toBe("rate_limited");
      expect(body.error?.requestId).toBe(String(res.headers.get("X-Request-Id")));
    } finally {
      resetRateLimits();
    }
  });
});
