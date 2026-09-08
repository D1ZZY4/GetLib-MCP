"use client";

import { Card } from "@heroui/react";
import { DiscoverSkeleton } from "./discover-skeleton";
import { PageContainer } from "../../../components/layout/page-container";
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
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Discover libraries
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Ask anything. Answers come from the live documentation pipeline, the same one
          AI agents call.
        </p>
      </header>

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
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
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
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void search(query)}
            className="text-sm font-medium text-accent underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!loading && error === null && result !== null ? <SearchResults result={result} /> : null}
    </PageContainer>
  );
}
