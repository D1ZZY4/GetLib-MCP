import type { LibraryFetch } from "@/web/lib/ranking";

interface RankingBarListProps {
  entries: LibraryFetch[];
  /** Accessible name for the ranking list. */
  label: string;
  emptyMessage?: string;
}

/**
 * Shared ranked bar list for library fetch counts. Both the dashboard
 * overview and the statistics ranking card render through this so the
 * presentation cannot drift between surfaces.
 */
export function RankingBarList({ entries, label, emptyMessage }: RankingBarListProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage ?? "No library fetches recorded yet."}</p>;
  }
  const top = entries[0]?.fetches ?? 1;

  return (
    <ol className="flex flex-col gap-3" aria-label={label}>
      {entries.map((entry, index) => (
        <li key={entry.id}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-medium">
              <span className="mr-2 font-mono text-xs text-muted tabular-nums">{index + 1}</span>
              {entry.name}
            </p>
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {entry.fetches} fetches
              <span className="sr-only">
                ({Math.round((entry.fetches / top) * 100)} percent of top)
              </span>
            </span>
          </div>
          <div
            role="presentation"
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-tertiary"
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(4, (entry.fetches / top) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
