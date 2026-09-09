/**
 * Canonical status-to-tone mapping for every status pill in the dashboard.
 *
 * success: online, healthy
 * warning: degraded
 * danger: everything else (offline, unavailable, error, unknown)
 *
 * Labels stay with the caller (each surface names its own states); only
 * the color mapping is centralized so "healthy" never means green in one
 * place and red in another.
 */
export function statusTone(status: string): string {
  if (status === "online" || status === "healthy") return "bg-success/10 text-success";
  if (status === "degraded") return "bg-warning/10 text-warning";
  return "bg-danger/10 text-danger";
}
