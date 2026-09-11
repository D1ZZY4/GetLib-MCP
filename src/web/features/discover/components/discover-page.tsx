"use client";

import { Card } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { DiscoverSkeleton } from "./discover-skeleton";
import { PageContainer } from "@/web/components/layout/page-container";
import { SearchField } from "./search-field";
import { SearchResults } from "./search-results";
import { useLibrarySearch } from "../hooks/use-library-search";

const EXAMPLE_QUERIES = [
  "React Server Components patterns",
  "CSS container queries browser support",
  "JWT security best practices",
] as const;

export function DiscoverPage() {
  const { query, setQuery, result, loading, error, searched, search } = useLibrarySearch();

  return (
    <PageContainer>
      <PageHeader
        title="Discover libraries"
        description="Ask anything. Answers come from the live documentation pipeline, the same one AI agents call."
      />

      <SearchField query={query} loading={loading} onQueryChange={setQuery} onSearch={search} />

      {!searched && !loading ? (
        <Card>
          <Card.Header>
            <Card.Title className="text-base">Try an example</Card.Title>
            <Card.Description>Pick a query to see how search answers.</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setQuery(example);
                    void search(example);
                  }}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted outline-none transition-colors hover:border-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  {example}
                </button>
              ))}
            </div>
          </Card.Content>
        </Card>
      ) : null}

      {loading ? <DiscoverSkeleton rows={4} /> : null}

      {!loading && error !== null ? (
        <LoadError message={error} onRetry={() => void search(query)} />
      ) : null}

      {!loading && error === null && result !== null ? <SearchResults result={result} /> : null}
    </PageContainer>
  );
}
