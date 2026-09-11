import { describe, expect, test } from "bun:test";
import { RateLimitError, resetRateLimits } from "@/server/mcp/utils/rate-limit";
import { jsonError, mapRouteError } from "./route-helpers";

describe("route error mapping", () => {
  test("rate limit maps to 429 with retry hint and request id", async () => {
    resetRateLimits();
    const response = mapRouteError(new RateLimitError(60), "req-123");
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.get("X-Request-Id")).toBe("req-123");
    const body = (await response.json()) as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe("rate_limited");
    expect(body.error.requestId).toBe("req-123");
  });

  test("unknown errors stay a generic 500 with correlation", async () => {
    const response = mapRouteError(new Error("boom-internal-detail"), "req-456");
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: { code: string; message: string; requestId: string } };
    expect(body.error.code).toBe("internal_error");
    expect(body.error.message).not.toContain("boom-internal-detail");
    expect(body.error.requestId).toBe("req-456");
  });

  test("jsonError always sets the request id header", async () => {
    const response = jsonError("not_found", "Missing.", 404, "req-789");
    expect(response.headers.get("X-Request-Id")).toBe("req-789");
  });
});
