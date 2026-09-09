/**
 * Minimal in-memory sliding-window rate limiter for API boundaries.
 *
 * One bucket per client identity (forwarded IP, else local) and route
 * scope. Bounded: expired entries are pruned on every check and the map
 * itself is capped. Serverless instances each enforce locally, which is
 * stricter (never looser) than a shared budget.
 */

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number = 60) {
    super("Too many requests. Slow down and try again shortly.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface RateLimitTier {
  limit: number;
  windowMs: number;
}

/** Sensitive credential endpoints: strict budget against brute force. */
export const STRICT_TIER: RateLimitTier = { limit: 10, windowMs: 60_000 };
/** Tool execution and mutations: moderate budget for expensive work. */
export const EXECUTION_TIER: RateLimitTier = { limit: 60, windowMs: 60_000 };
/** Read-only control-plane endpoints: generous budget for polling UIs. */
export const READ_TIER: RateLimitTier = { limit: 300, windowMs: 60_000 };

const MAX_BUCKETS = 10_000;

const buckets = new Map<string, number[]>();

function clientIdentity(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "local";
}

export function checkRateLimit(
  req: Request,
  scope: string,
  tier: RateLimitTier,
  now: number = Date.now(),
): void {
  const key = `${scope}:${clientIdentity(req)}`;
  const cutoff = now - tier.windowMs;
  const hits = (buckets.get(key) ?? []).filter((at) => at > cutoff);
  if (hits.length >= tier.limit) {
    throw new RateLimitError(Math.ceil(tier.windowMs / 1000));
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) buckets.delete(oldest);
  }
}

/** Test hook - clears all buckets. */
export function resetRateLimits(): void {
  buckets.clear();
}
