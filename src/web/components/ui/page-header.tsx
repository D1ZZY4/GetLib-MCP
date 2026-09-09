import type { ReactNode } from "react";

/**
 * Canonical page header: title, description, optional trailing badge.
 * Title accepts nodes so callers can keep semantic tweaks (e.g. a
 * monospace server name) without inventing a new header layout.
 */
export function PageHeader({
  title,
  description,
  badge,
}: {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <header>
      {badge ? (
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {badge}
        </div>
      ) : (
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      )}
      {description ? <p className="mt-1 max-w-xl text-sm text-muted">{description}</p> : null}
    </header>
  );
}
