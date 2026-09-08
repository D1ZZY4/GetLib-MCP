import { Card } from "@heroui/react";
import { rankLibraryFetches, type LibraryFetch } from "../services/statistics-api.service";

export function FetchRanking({ fetches }: { fetches: LibraryFetch[] }) {
  const ranked = rankLibraryFetches(fetches);
  const top = ranked[0]?.fetches ?? 1;

  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>Most fetched</Card.Title>
          <Card.Description>Doc fetch ranking per library</Card.Description>
      </Card.Header>
      <Card.Content>
        <ol className="flex flex-col gap-3" aria-label="Most fetched libraries">
          {ranked.map((entry, index) => (
            <li key={entry.id}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">
                  <span className="mr-2 font-mono text-xs text-muted tabular-nums">
                    {index + 1}
                  </span>
                  {entry.name}
                </p>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {entry.fetches} fetches
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
      </Card.Content>
    </Card>
  );
}
