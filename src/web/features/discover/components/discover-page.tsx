"use client";

import { DiscoverSkeleton } from "./discover-skeleton";
import { LibraryCatalog } from "./library-catalog";
import { PageContainer } from "../../../components/layout/page-container";
import { SearchField } from "./search-field";
import { useLibrarySearch } from "../hooks/use-library-search";

export function DiscoverPage() {
  const { query, setQuery, results, loading } = useLibrarySearch();

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Discover libraries
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Search the mock catalog to resolve a package and browse its docs.
        </p>
      </header>

      <SearchField query={query} resultCount={results.length} onQueryChange={setQuery} />

      {loading ? (
        <DiscoverSkeleton rows={4} />
      ) : (
        <LibraryCatalog results={results} query={query} />
      )}
    </PageContainer>
  );
}
