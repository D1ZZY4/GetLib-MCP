"use client";

import { Button } from "@heroui/react";
import { SearchIcon } from "../../../components/ui/icons";

interface SearchFieldProps {
  query: string;
  loading: boolean;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
}

export function SearchField({ query, loading, onQueryChange, onSearch }: SearchFieldProps) {
  return (
    <form
      role="search"
      aria-label="Documentation search"
      className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query);
      }}
    >
      <div className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-accent">
        <SearchIcon className="size-4 shrink-0 text-muted" />
        <label htmlFor="discover-search" className="sr-only">
          Search documentation
        </label>
        <input
          id="discover-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="e.g. React Server Components patterns"
          autoComplete="off"
          className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted"
        />
      </div>
      <Button type="submit" isDisabled={loading || query.trim() === ""} className="shrink-0">
        {loading ? "Searching..." : "Search"}
      </Button>
    </form>
  );
}
