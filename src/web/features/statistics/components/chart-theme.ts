/**
 * Shared chart chrome for recharts surfaces. Every chart uses the product
 * CSS variables so light/dark themes stay consistent without per-chart
 * style objects drifting apart.
 */
export const chartTooltipStyle = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "var(--foreground)",
} as const;

export const chartTooltipLabelStyle = {
  color: "var(--foreground)",
} as const;

export const chartAxisTick = {
  fill: "var(--muted)",
  fontSize: 11,
} as const;

export const chartGridStroke = "var(--border)";

export const chartAccent = "var(--accent)";
