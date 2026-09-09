import { beforeEach, describe, expect, test } from "bun:test";
import {
  checkRateLimit,
  RateLimitError,
  resetRateLimits,
  type RateLimitTier,
} from "../utils/rate-limit";

const TIER: RateLimitTier = { limit: 3, windowMs: 60_000 };

function request(): Request {
  return new Request("http://localhost/api/management/health", {
    headers: { "x-forwarded-for": "9.9.9.9" },
  });
}

beforeEach(() => {
  resetRateLimits();
});

describe("rate limiter", () => {
  test("allows requests within budget", () => {
    const req = request();
    expect(() => checkRateLimit(req, "test/scope", TIER, 1_000)).not.toThrow();
    expect(() => checkRateLimit(req, "test/scope", TIER, 2_000)).not.toThrow();
    expect(() => checkRateLimit(req, "test/scope", TIER, 3_000)).not.toThrow();
  });

  test("rejects past the limit with 429 semantics", () => {
    const req = request();
    checkRateLimit(req, "test/scope", TIER, 1_000);
    checkRateLimit(req, "test/scope", TIER, 2_000);
    checkRateLimit(req, "test/scope", TIER, 3_000);
    expect(() => checkRateLimit(req, "test/scope", TIER, 4_000)).toThrow(RateLimitError);
  });

  test("window expiry restores budget", () => {
    const req = request();
    checkRateLimit(req, "test/scope", TIER, 1_000);
    checkRateLimit(req, "test/scope", TIER, 2_000);
    checkRateLimit(req, "test/scope", TIER, 3_000);
    expect(() => checkRateLimit(req, "test/scope", TIER, 70_000)).not.toThrow();
  });

  test("scopes isolate budgets", () => {
    const req = request();
    checkRateLimit(req, "test/a", TIER, 1_000);
    checkRateLimit(req, "test/a", TIER, 2_000);
    checkRateLimit(req, "test/a", TIER, 3_000);
    expect(() => checkRateLimit(req, "test/b", TIER, 4_000)).not.toThrow();
  });
});
