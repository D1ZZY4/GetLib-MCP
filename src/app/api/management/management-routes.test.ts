import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resetConfigOverride, setConfigOverride } from "@/server/mcp/config";
import { resetRateLimits } from "@/server/mcp/utils/rate-limit";
import { resetDatabaseCache } from "@/server/mcp/infrastructure/database";
import { GET as apikeysGet, POST as apikeysPost, DELETE as apikeysDelete } from "./apikeys/route";
import { POST as toolsRun } from "./tools/run/route";
import { POST as signin } from "./auth/signin/route";
import { GET as logsGet } from "./logs/route";
import { PUT as sourcesPut } from "./sources/route";

/**
 * Thin-route contract tests: auth gate, input validation, and
 * delegation for management routes. Business behavior stays covered
 * at the service layer; these pin the HTTP boundary only.
 */
beforeEach(() => {
  resetRateLimits();
  resetDatabaseCache();
});

afterEach(() => {
  resetConfigOverride();
  resetRateLimits();
  resetDatabaseCache();
});

function jsonRequest(url: string, method: string, body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("management route auth gate", () => {
  test("protected routes reject unauthenticated callers with 401", async () => {
    setConfigOverride({ authEnabled: true });
    for (const res of [
      await apikeysGet(jsonRequest("http://localhost/api/management/apikeys", "GET")),
      await toolsRun(jsonRequest("http://localhost/api/management/tools/run", "POST", {})),
      await logsGet(new Request("http://localhost/api/management/logs")),
    ]) {
      expect(res.status).toBe(401);
    }
  });
});

describe("signin route", () => {
  test("wrong credentials yield a neutral 401 without identity hints", async () => {
    setConfigOverride({ authEnabled: true, defaultAccount: "ops@example.com", defaultPass: "CorrectHorse99" });
    const res = await signin(
      jsonRequest("http://localhost/api/management/auth/signin", "POST", {
        email: "ops@example.com",
        password: "wrong",
      }),
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("unauthorized");
    expect(body.error.message).not.toMatch(/ops@example\.com|CorrectHorse99/i);
  });

  test("valid credentials issue a session cookie", async () => {
    setConfigOverride({
      authEnabled: true,
      defaultAccount: "ops@example.com",
      defaultPass: "CorrectHorse99",
      sessionSecret: "route-test-secret",
    });
    const res = await signin(
      jsonRequest("http://localhost/api/management/auth/signin", "POST", {
        email: "ops@example.com",
        password: "CorrectHorse99",
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Set-Cookie")).toMatch(/getlib_session=v1\./);
    const body = (await res.json()) as { ok: boolean; name: string };
    expect(body.ok).toBe(true);
    expect(body.name).toBe("ops");
  });
});

describe("apikeys routes", () => {
  test("create, list, and delete round-trip with the key shown once", async () => {
    setConfigOverride({ authEnabled: false });
    const created = (await (
      await apikeysPost(
        jsonRequest("http://localhost/api/management/apikeys", "POST", { name: "route-test" }),
      )
    ).json()) as { id: number; name: string; key: string; prefix: string };
    expect(created.key.startsWith("glk_")).toBe(true);
    const listed = (await (
      await apikeysGet(jsonRequest("http://localhost/api/management/apikeys", "GET"))
    ).json()) as { keys: Array<{ id: number; name: string }> };
    expect(listed.keys.map((key) => key.name)).toContain("route-test");
    expect(JSON.stringify(listed)).not.toContain(created.key);
    const deleted = (await (
      await apikeysDelete(
        jsonRequest("http://localhost/api/management/apikeys", "DELETE", { id: created.id }),
      )
    ).json()) as { deleted: number };
    expect(deleted.deleted).toBe(created.id);
    const missing = await apikeysDelete(
      jsonRequest("http://localhost/api/management/apikeys", "DELETE", { id: created.id }),
    );
    expect(missing.status).toBe(404);
    const relisted = (await (
      await apikeysGet(jsonRequest("http://localhost/api/management/apikeys", "GET"))
    ).json()) as { keys: Array<{ id: number; name: string }> };
    expect(relisted.keys.map((key) => key.id)).not.toContain(created.id);
  });

  test("blank names are 422, unknown ids are 404", async () => {
    setConfigOverride({ authEnabled: false });
    const blank = await apikeysPost(
      jsonRequest("http://localhost/api/management/apikeys", "POST", { name: "   " }),
    );
    expect(blank.status).toBe(422);
    const missing = await apikeysDelete(
      jsonRequest("http://localhost/api/management/apikeys", "DELETE", { id: 424242 }),
    );
    expect(missing.status).toBe(404);
  });
});

describe("validation mapping", () => {
  test("unknown tools are 404 and malformed bodies are 422", async () => {
    setConfigOverride({ authEnabled: false });
    const unknown = await toolsRun(
      jsonRequest("http://localhost/api/management/tools/run", "POST", { tool: "gl_nope", args: {} }),
    );
    expect(unknown.status).toBe(404);
    const malformed = await toolsRun(
      jsonRequest("http://localhost/api/management/tools/run", "POST", { tool: "../escape" }),
    );
    expect(malformed.status).toBe(422);
  });

  test("invalid log limits are 400", async () => {
    setConfigOverride({ authEnabled: false });
    const res = await logsGet(new Request("http://localhost/api/management/logs?limit=abc"));
    expect(res.status).toBe(400);
  });

  test("oversized source lists are rejected", async () => {
    setConfigOverride({ authEnabled: false });
    const res = await sourcesPut(
      jsonRequest("http://localhost/api/management/sources", "PUT", {
        blocked: Array.from({ length: 201 }, (_, index) => `x${index}`),
      }),
    );
    expect(res.status).toBe(422);
  });
});
