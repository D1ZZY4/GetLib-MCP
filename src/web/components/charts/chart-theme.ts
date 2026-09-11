/**
 * Shared chart chrome for recharts surfaces. Every chart uses the product
 * CSS variables so light/dark themes stay consistent without per-chart
 * style objects drifting apart. Tooltip rendering lives in
 * chart-tooltip.tsx (custom card content); this file keeps scalar tokens.
 * Owned by shared UI: consumed by the statistics and dashboard features.
 */
export const chartAxisTick = {
  fill: "var(--muted)",
  fontSize: 11,
} as const;

export const chartGridStroke = "var(--border)";

export const chartAccent = "var(--accent)";

/**
 * Categorical fill rotation for share charts (radial, pie). Centralized
 * so every proportion surface cycles the same semantic palette.
 */
export const chartFills = [
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
  "var(--danger)",
  "var(--muted)",
] as const;
