/** Rolling window of tool-invocation outcomes and the counters derived from it. */

import { percentileOfSorted } from "./metrics";

export interface InvocationOutcome {
  tool: string;
  requestId: string;
  ts: number;
  durationMs: number;
  success: boolean;
  cacheHit: boolean;
  resolved: boolean;
  error?: string;
  /** Canonical library id the call was about, when a handler recorded one. */
  subject?: string;
}

/**
 * Single outcome-window definition. The in-memory ring below and the
 * durable read window in statistics.service.ts both use this so totals,
 * charts, and health aggregate the same recent history. The per-tool
 * latency ring in metrics.ts is a separate concern (Prometheus gauge
 * basis per tool) and intentionally keeps its own cap.
 */
export const OUTCOME_WINDOW = 200;

const RECENT_OUTCOMES_CAP = OUTCOME_WINDOW;
const recentOutcomes: InvocationOutcome[] = [];

export function pushOutcome(o: InvocationOutcome): void {
  recentOutcomes.push(o);
  if (recentOutcomes.length > RECENT_OUTCOMES_CAP) {
    recentOutcomes.shift();
  }
}

/** Read-only access to the last 200 invocation outcomes - for /health endpoint */
export function getRecentOutcomes(): readonly InvocationOutcome[] {
  return recentOutcomes;
}

/** Aggregated success/resolution counters over the recent outcome window */
export function getInvocationSummary(): {
  totalCalls: number;
  successRate: number;
  resolveRate: number;
  errorRate: number;
  byTool: Record<string, { calls: number; successRate: number; resolveRate: number; p50: number; p95: number; p99: number }>;
} {
  if (recentOutcomes.length === 0) {
    // Cold start, not proven reliability: zero calls with neutral 100%
    // rates so empty states render as "no data yet" instead of 0%.
    // summarizeOutcomePoints uses the same convention on the percent
    // scale (100). Consumers must check totalCalls === 0 for "no data".
    return { totalCalls: 0, successRate: 1, resolveRate: 1, errorRate: 0, byTool: {} };
  }

  let success = 0;
  let resolved = 0;
  const byTool = new Map<string, { calls: number; success: number; resolved: number; latencies: number[] }>();

  for (const o of recentOutcomes) {
    if (o.success) success++;
    if (o.resolved) resolved++;
    let entry = byTool.get(o.tool);
    if (!entry) {
      entry = { calls: 0, success: 0, resolved: 0, latencies: [] };
      byTool.set(o.tool, entry);
    }
    entry.calls++;
    if (o.success) entry.success++;
    if (o.resolved) entry.resolved++;
    entry.latencies.push(o.durationMs);
  }

  const byToolOut: Record<string, { calls: number; successRate: number; resolveRate: number; p50: number; p95: number; p99: number }> = {};
  for (const [tool, m] of byTool.entries()) {
    const sorted = [...m.latencies].sort((a, b) => a - b);
    const p50 = percentileOfSorted(sorted, 50);
    const p95 = percentileOfSorted(sorted, 95);
    const p99 = percentileOfSorted(sorted, 99);
    byToolOut[tool] = {
      calls: m.calls,
      successRate: m.calls > 0 ? +(m.success / m.calls).toFixed(3) : 1,
      resolveRate: m.calls > 0 ? +(m.resolved / m.calls).toFixed(3) : 1,
      p50,
      p95,
      p99,
    };
  }

  return {
    totalCalls: recentOutcomes.length,
    successRate: +(success / recentOutcomes.length).toFixed(3),
    resolveRate: +(resolved / recentOutcomes.length).toFixed(3),
    errorRate: +(1 - success / recentOutcomes.length).toFixed(3),
    byTool: byToolOut,
  };
}

/** Reset the in-memory outcome window - used by tests */
export function resetTelemetry(): void {
  recentOutcomes.length = 0;
}
