import { Card } from "@heroui/react";
import type { MockDiscoverLibrary } from "../types";

interface LibraryCatalogProps {
  results: MockDiscoverLibrary[];
  query: string;
}

export function LibraryCatalog({ results, query }: LibraryCatalogProps) {
  if (results.length === 0) {
    return (
      <Card>
        <Card.Content>
          <p className="text-sm text-muted">
            No libraries match “{query.trim()}”. Try a different keyword or clear the search to browse all libraries.
          </p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2" aria-label="Discovered libraries">
      {results.map((lib) => (
        <li key={lib.id}>
          <Card className="flex h-full flex-col">
            <Card.Header>
              <div className="flex items-start justify-between gap-2">
                <Card.Title>{lib.name}</Card.Title>
                <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent tabular-nums">
                  v{lib.latestVersion}
                </span>
              </div>
              <Card.Description>{lib.weeklyDownloads} downloads/week</Card.Description>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-muted">{lib.description}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Tags for ${lib.name}`}>
                {lib.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs text-muted"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </Card.Content>
          </Card>
        </li>
      ))}
    </ul>
  );
}
