import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resetConfigOverride, setConfigOverride } from "../config";
import { resetRateLimits } from "../utils/rate-limit";
import { handleHttpRequest } from "../transport/http";
import { closeAllSseSessions } from "../transport/sse";
import { GET as sseGet } from "@/app/api/mcp/sse/route";
import { POST as sseMessagesPost } from "@/app/api/mcp/sse/messages/route";
import { GET as healthGet } from "@/app/api/management/health/route";

/**
 * Transport auth matrix: every MCP entry point enforces the same
 * requireManagementAuth boundary, and the health endpoint stays public
 * for load balancers and the Docker HEALTHCHECK in both modes.
 */
beforeEach(() => {
  resetRateLimits();
});

afterEach(async () => {
  resetConfigOverride();
  resetRateLimits();
  await closeAllSseSessions();
});

function mcpPost(body: unknown): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify(body),
  });
}

function initialize(id: number): Request {
  return mcpPost({
    jsonrpc: "2.0",
    id,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "transport-auth-test", version: "0.0.0" },
    },
  });
}

describe("MCP transport auth matrix (auth enabled)", () => {
  beforeEach(() => {
    setConfigOverride({ authEnabled: true });
  });

  test("streamable HTTP rejects unauthenticated protocol calls with 401", async () => {
    const res = await handleHttpRequest(initialize(1));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("unauthorized");
  });

  test("SSE open rejects unauthenticated streams with 401", async () => {
    const res = await sseGet(new Request("http://localhost/api/mcp/sse"));
    expect(res.status).toBe(401);
  });

  test("SSE messages rejects unauthenticated posts with 401", async () => {
    const res = await sseMessagesPost(
      new Request("http://localhost/api/mcp/sse/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(401);
  });

  test("a valid API key opens the protocol without a session", async () => {
    const { createApiKey } = await import("@/application/apikeys/apikeys.service");
    const { liveApiKeyDeps } = await import("../infrastructure/deps/apikeys-deps");
    const { resetDatabaseCache, getDatabase } = await import("../infrastructure/database");
    resetDatabaseCache();
    const created = await createApiKey(liveApiKeyDeps, "transport-auth-test");
    try {
      const res = await handleHttpRequest(
        new Request("http://localhost/api/mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            Authorization: `Bearer ${created.key}`,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 7,
            method: "initialize",
            params: {
              protocolVersion: "2025-06-18",
              capabilities: {},
              clientInfo: { name: "transport-auth-test", version: "0.0.0" },
            },
          }),
        }),
      );
      expect(res.status).toBe(200);
      const stored = await getDatabase().listApiKeys();
      expect(stored.find((row) => row.id === created.id)?.lastUsedAt).not.toBeNull();
    } finally {
      resetDatabaseCache();
    }
  });

  test("a revoked API key stays at 401", async () => {
    const { createApiKey, revokeApiKey } = await import("@/application/apikeys/apikeys.service");
    const { liveApiKeyDeps } = await import("../infrastructure/deps/apikeys-deps");
    const { resetDatabaseCache } = await import("../infrastructure/database");
    resetDatabaseCache();
    const created = await createApiKey(liveApiKeyDeps, "transport-auth-test");
    await revokeApiKey(liveApiKeyDeps, created.id);
    try {
      const res = await handleHttpRequest(
        new Request("http://localhost/api/mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            Authorization: `Bearer ${created.key}`,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 8,
            method: "initialize",
            params: {
              protocolVersion: "2025-06-18",
              capabilities: {},
              clientInfo: { name: "transport-auth-test", version: "0.0.0" },
            },
          }),
        }),
      );
      expect(res.status).toBe(401);
    } finally {
      resetDatabaseCache();
    }
  });

  test("health stays public with 200", async () => {
    const res = await healthGet(new Request("http://localhost/api/management/health"));
    expect(res.status).toBe(200);
  });
});

describe("MCP transport auth matrix (auth disabled)", () => {
  beforeEach(() => {
    setConfigOverride({ authEnabled: false });
  });

  test("streamable HTTP serves protocol calls with 200", async () => {
    const res = await handleHttpRequest(initialize(1));
    expect(res.status).toBe(200);
  });

  test("SSE open serves streams with 200", async () => {
    const res = await sseGet(new Request("http://localhost/api/mcp/sse"));
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });

  test("SSE messages without sessionId is 400, not 401", async () => {
    const res = await sseMessagesPost(
      new Request("http://localhost/api/mcp/sse/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(400);
  });

  test("health stays public with 200", async () => {
    const res = await healthGet(new Request("http://localhost/api/management/health"));
    expect(res.status).toBe(200);
  });
});
