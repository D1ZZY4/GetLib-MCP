/**
 * Shared chart chrome for recharts surfaces. Every chart uses the product
 * CSS variables so light/dark themes stay consistent without per-chart
 * style objects drifting apart. Tooltip rendering lives in
 * chart-tooltip.tsx (custom card content); this file keeps scalar tokens.
 */
export const chartAxisTick = {
  fill: "var(--muted)",
  fontSize: 11,
} as const;

export const chartGridStroke = "var(--border)";

export const chartAccent = "var(--accent)";
