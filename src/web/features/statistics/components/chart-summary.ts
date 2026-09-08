import type { UsageDay } from "../services/statistics.service";

/** Total requests across the window, for card footers. */
export function totalRequests(days: UsageDay[]): number {
  return days.reduce((total, day) => total + day.requests, 0);
}

/**
 * One-line trend summary (shadcn footer pattern): compares the last day
 * against the first so the footer always describes the visible window.
 */
export function trendSummary(days: UsageDay[]): string {
  const first = days[0]?.requests ?? 0;
  const last = days.length > 0 ? (days[days.length - 1]?.requests ?? 0) : 0;
  if (first <= 0) return `Ended at ${last} requests`;
  const percent = Math.round(((last - first) / first) * 100);
  if (percent === 0) return "Holding steady this period";
  return percent > 0
    ? `Trending up by ${percent}% this period`
    : `Trending down by ${Math.abs(percent)}% this period`;
}
