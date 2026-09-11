import { describe, expect, test, afterEach } from "bun:test";
import { fetchJson } from "./api-client";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchJson error envelopes", () => {
  test("carries the request id for server correlation", async () => {
    globalThis.fetch = (async () =>
      jsonResponse({ error: { code: "internal_error", message: "Unexpected error while handling the request.", requestId: "req-123" } }, 500)) as unknown as typeof fetch;
    const failure = await fetchJson("/api/management/apikeys").then(
      () => "resolved",
      (error: unknown) => (error instanceof Error ? error.message : "unknown"),
    );
    expect(failure).toContain("Unexpected error while handling the request.");
    expect(failure).toContain("req-123");
  });

  test("falls back cleanly without an envelope", async () => {
    globalThis.fetch = (async () => new Response("oops", { status: 502 })) as unknown as typeof fetch;
    const failure = await fetchJson("/api/management/apikeys").then(
      () => "resolved",
      (error: unknown) => (error instanceof Error ? error.message : "unknown"),
    );
    expect(failure).toContain("502");
  });
});
