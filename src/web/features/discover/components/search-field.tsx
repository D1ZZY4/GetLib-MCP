interface SearchFieldProps {
  query: string;
  resultCount: number;
  onQueryChange: (query: string) => void;
}

export function SearchField({ query, resultCount, onQueryChange }: SearchFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="discover-search" className="text-sm font-medium">
        Search libraries
      </label>
      <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-accent">
        <svg
          aria-hidden="true"
          className="size-4 shrink-0 text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          id="discover-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="e.g. react, tailwindcss, supabase"
          autoComplete="off"
          className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted"
        />
        <span
          role="status"
          aria-live="polite"
          className="shrink-0 text-xs text-muted tabular-nums"
        >
          {resultCount} {resultCount === 1 ? "result" : "results"}
        </span>
      </div>
    </div>
  );
}
