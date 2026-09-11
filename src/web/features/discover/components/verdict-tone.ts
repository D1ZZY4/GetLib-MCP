/**
 * Evidence-verdict-to-tone mapping owned by the discover feature: only
 * discovery surfaces (result lists, doc details) consume it. Labels stay
 * with the caller (result lists and doc details word them differently),
 * only the color mapping is centralized here. Unknown verdicts fall back
 * to the neutral tone.
 */
export function verdictTone(verdict: string): string {
  if (verdict === "strong") return "bg-success/10 text-success";
  if (verdict === "weak") return "bg-warning/10 text-warning";
  if (verdict === "miss") return "bg-danger/10 text-danger";
  return "bg-surface-tertiary text-muted";
}
