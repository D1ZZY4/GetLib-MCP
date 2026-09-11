/**
 * Canonical status-to-tone mapping for every status pill.
 * Complies with `ui-ux.md` sections 37 (semantic color), 17 (state
 * consistency), and 4 (semantic tokens over raw palette values).
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
 * Canonical severity-to-surface mapping for filled attention banners.
 * High maps to danger, medium to warning, low to success, extended
 * with the border treatment attention banners need.
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
 * Canonical activity-kind-to-dot mapping for the dashboard recent-activity
 * timeline. Kinds are content categories, not health states, so they use
 * solid dots instead of statusTone. Centralized here so a new kind cannot
 * drift into an ad-hoc color in the feature component.
 */
export function activityKindTone(kind: string): string {
  if (kind === "resolve") return "bg-accent";
  if (kind === "docs") return "bg-success";
  if (kind === "audit") return "bg-warning";
  return "bg-muted";
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
