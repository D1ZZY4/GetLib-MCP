/**
 * Canonical evidence-verdict-to-tone mapping for discovery surfaces.
 * Same ownership rule as statusTone: labels stay with the caller (result
 * lists and doc details word them differently), only the color mapping
 * is centralized. Unknown verdicts fall back to the neutral tone.
 */
export function verdictTone(verdict: string): string {
  if (verdict === "strong") return "bg-success/10 text-success";
  if (verdict === "weak") return "bg-warning/10 text-warning";
  if (verdict === "miss") return "bg-danger/10 text-danger";
  return "bg-surface-tertiary text-muted";
}
