interface ToolMetrics {
  invocations: number;
  totalMs: number;
  errors: number;
  cacheHits: number;
  cacheMisses: number;
  latencies: number[];
}

const RING_SIZE = 100;
const metricsStore = new Map<string, ToolMetrics>();
const startTime = Date.now();

function getOrCreate(tool: string): ToolMetrics {
  let m = metricsStore.get(tool);
  if (!m) {
    m = { invocations: 0, totalMs: 0, errors: 0, cacheHits: 0, cacheMisses: 0, latencies: [] };
    metricsStore.set(tool, m);
  }
  return m;
}

export function recordToolCall(tool: string, durationMs: number, cacheHit: boolean, error: boolean): void {
  const m = getOrCreate(tool);
  m.invocations++;
  m.totalMs += durationMs;
  if (error) m.errors++;
  if (cacheHit) m.cacheHits++;
  else m.cacheMisses++;
  m.latencies.push(durationMs);
  if (m.latencies.length > RING_SIZE) m.latencies.shift();
}

/**
 * Canonical percentile definition for every surface (Prometheus gauges,
 * health telemetry, statistics). Nearest-rank on the sorted sample:
 * the smallest value at or above the requested percentage. All other
 * modules must use this instead of their own index math.
 */
export function percentileOfSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

export function getUptimeSeconds(): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

/** Test isolation only. Production code never calls this. */
export function resetMetrics(): void {
  metricsStore.clear();
}
