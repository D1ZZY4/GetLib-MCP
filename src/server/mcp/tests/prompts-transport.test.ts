import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../server";
import { resetConfigOverride, setConfigOverride } from "../config";
import { handleHttpRequest } from "../transport/http";

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

function post(body: unknown): Request {
  return new Request("http://localhost/api/mcp/http", {
    method: "POST",
    headers: { ...HEADERS },
    body: JSON.stringify(body),
  });
}

const KNOWN_PROMPTS = [
  "review-libraries",
  "get-docs",
  "best-practices",
  "migrate-library",
  "audit-project",
  "compare-libraries",
];

const FULL_ARGS: Record<string, Record<string, string>> = {
  "review-libraries": { projectPath: "." },
  "get-docs": { libraryId: "facebook/react", topic: "hooks" },
  "best-practices": { libraryId: "vercel/next.js", topic: "performance" },
  "migrate-library": { libraryId: "vercel/next.js", fromVersion: "14", toVersion: "15" },
  "audit-project": { projectPath: "." },
  "compare-libraries": { libraries: "react,vue", criteria: "performance" },
};

async function promptsGet(
  id: number,
  name: string,
  args: Record<string, string>,
): Promise<{ status: number; body: { result?: { messages?: Array<{ content?: { text?: string } }> }; error?: { message?: string } } }> {
  const res = await handleHttpRequest(
    post({ jsonrpc: "2.0", id, method: "prompts/get", params: { name, arguments: args } }),
  );
  const body = (await res.json()) as {
    result?: { messages?: Array<{ content?: { text?: string } }> };
    error?: { message?: string };
  };
  return { status: res.status, body };
}

describe("prompts over Streamable HTTP transport", () => {
  test("prompts/list exposes every registered prompt with arguments", async () => {
    const res = await handleHttpRequest(
      post({ jsonrpc: "2.0", id: 101, method: "prompts/list", params: {} }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result?: { prompts?: Array<{ name: string; description?: string; arguments?: unknown }> };
    };
    const names = (body.result?.prompts ?? []).map((p) => p.name);
    for (const name of KNOWN_PROMPTS) {
      expect(names).toContain(name);
    }
  });

  test("prompts/get renders with full args", async () => {
    const res = await handleHttpRequest(
      post({
        jsonrpc: "2.0",
        id: 102,
        method: "prompts/get",
        params: { name: "get-docs", arguments: { libraryId: "facebook/react", topic: "hooks" } },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result?: { messages?: Array<{ content?: { text?: string } }> };
    };
    const text = body.result?.messages?.[0]?.content?.text ?? "";
    expect(text).toContain("facebook/react");
  });

  test("prompts/get with no args is a clean prompt error, not a transport error", async () => {
    const res = await handleHttpRequest(
      post({
        jsonrpc: "2.0",
        id: 103,
        method: "prompts/get",
        params: { name: "get-docs", arguments: {} },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { error?: { message?: string } };
    expect(typeof body.error?.message).toBe("string");
    expect(body.error?.message ?? "").not.toContain("not initialized");
  });

  test("prompts/get with garbage args never crashes the transport", async () => {
    const res = await handleHttpRequest(
      post({
        jsonrpc: "2.0",
        id: 104,
        method: "prompts/get",
        params: { name: "get-docs", arguments: { libraryId: "garbage-xyz", topic: "asdasdasdxyz !@#$%" } },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result?: { messages?: Array<{ content?: { text?: string } }> };
      error?: { message?: string };
    };
    const ok = typeof body.result?.messages?.[0]?.content?.text === "string" || typeof body.error?.message === "string";
    expect(ok).toBe(true);
  });

  test("prompts/get for an unknown prompt is a clean error", async () => {
    const res = await handleHttpRequest(
      post({
        jsonrpc: "2.0",
        id: 105,
        method: "prompts/get",
        params: { name: "gl_nope", arguments: {} },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { error?: { message?: string } };
    expect(typeof body.error?.message).toBe("string");
  });

  test("every prompt renders over HTTP with full args", async () => {
    let id = 201;
    for (const name of KNOWN_PROMPTS) {
      const { status, body } = await promptsGet(id++, name, FULL_ARGS[name] ?? {});
      expect(status).toBe(200);
      const text = body.result?.messages?.[0]?.content?.text ?? "";
      expect(text.length).toBeGreaterThan(0);
    }
  });

  test("every prompt answers no-args with a clean error or result, never a transport crash", async () => {
    let id = 301;
    for (const name of KNOWN_PROMPTS) {
      const { status, body } = await promptsGet(id++, name, {});
      expect(status).toBe(200);
      const ok =
        typeof body.result?.messages?.[0]?.content?.text === "string" ||
        typeof body.error?.message === "string";
      expect(ok).toBe(true);
      expect(body.error?.message ?? "").not.toContain("not initialized");
    }
  });

  test("every prompt survives garbage args over HTTP", async () => {
    let id = 401;
    for (const name of KNOWN_PROMPTS) {
      const garbage: Record<string, string> = { nonsense: "asdasdasdxyz !@#$%" };
      for (const key of Object.keys(FULL_ARGS[name] ?? {})) garbage[key] = "garbage-xyz !@#$%";
      const { status, body } = await promptsGet(id++, name, garbage);
      expect(status).toBe(200);
      const ok =
        typeof body.result?.messages?.[0]?.content?.text === "string" ||
        typeof body.error?.message === "string";
      expect(ok).toBe(true);
    }
  });

  test("parallel prompts/list calls are identical", async () => {
    const calls = Array.from({ length: 5 }, (_, i) =>
      handleHttpRequest(post({ jsonrpc: "2.0", id: 500 + i, method: "prompts/list", params: {} })),
    );
    const bodies = await Promise.all(calls.map(async (p) => ((await (await p).json()) as {
      result?: { prompts?: Array<{ name: string }> };
    }).result?.prompts?.map((pr) => pr.name).sort() ?? []));
    const first: string[] = bodies[0] ?? [];
    for (const names of bodies) {
      expect(names).toEqual(first);
      for (const known of KNOWN_PROMPTS) expect(names).toContain(known);
    }
  });

  test("prompts/list and prompts/get work over the stdio-equivalent in-memory transport", async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: "prompts-parity-test", version: "0.0.0" });
    await client.connect(clientTransport);
    try {
      const listed = await client.listPrompts();
      const names = listed.prompts.map((p) => p.name);
      for (const known of KNOWN_PROMPTS) expect(names).toContain(known);
      for (const name of KNOWN_PROMPTS) {
        const rendered = await client.getPrompt({ name, arguments: FULL_ARGS[name] });
        const text = (rendered.messages[0]?.content as { text?: string } | undefined)?.text ?? "";
        expect(text.length).toBeGreaterThan(0);
      }
    } finally {
      await client.close();
    }
  });
});
