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

/**
 * Canonical severity-to-tone mapping for attention and audit surfaces.
 * High maps to danger, medium to warning, low to success. Unknown
 * severities fall back to the neutral tone instead of guessing.
 */
export function severityTone(severity: string): string {
  if (severity === "high") return "bg-danger/10 text-danger";
  if (severity === "medium") return "bg-warning/10 text-warning";
  if (severity === "low") return "bg-success/10 text-success";
  return "bg-surface-tertiary text-muted";
}

/**
 * Canonical severity-to-surface mapping for filled attention banners.
 * Same severity taxonomy as severityTone, extended with the border
 * treatment attention banners need.
 */
export function severityFill(severity: string): string {
  if (severity === "high") return "border-danger/20 bg-danger/10";
  if (severity === "medium") return "border-warning/25 bg-warning/10";
  if (severity === "low") return "border-success/20 bg-success/10";
  return "border-border bg-surface-secondary";
}

/**
 * Canonical library-status-to-tone mapping for project and dependency
 * surfaces. Up-to-date maps to success, outdated to warning, vulnerable
 * to danger. Unknown states fall back to neutral.
 */
export function libraryStatusTone(status: string): string {
  if (status === "up-to-date") return "bg-success/10 text-success";
  if (status === "outdated") return "bg-warning/10 text-warning";
  if (status === "vulnerable") return "bg-danger/10 text-danger";
  return "bg-surface-tertiary text-muted";
}

/**
 * Canonical transport/availability-to-tone mapping for install and
 * transport surfaces. Available and connected map to success, planned
 * to warning. Unknown states fall back to neutral.
 */
export function availabilityTone(status: string): string {
  if (status === "available" || status === "connected") return "bg-success/10 text-success";
  if (status === "planned") return "bg-warning/10 text-warning";
  return "bg-surface-tertiary text-muted";
}
