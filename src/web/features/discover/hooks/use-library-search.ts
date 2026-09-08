"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { searchLibraries, type DiscoverResult } from "../services/discover.service";

const LOAD_ERROR = "We couldn't run the search. Try again in a moment.";

function searchHref(query: string): string {
  const normalized = query.trim();
  return normalized === "" ? "/discover" : `/discover?q=${encodeURIComponent(normalized)}`;
}

export function useLibrarySearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const autoRan = useRef(false);

  const search = useCallback(
    async (rawQuery: string) => {
      const normalized = rawQuery.trim();
      if (normalized === "") return;
      router.replace(searchHref(normalized));
      setLoading(true);
      setError(null);
      try {
        setResult(await searchLibraries(normalized));
        setSearched(true);
      } catch {
        setError(LOAD_ERROR);
        setResult(null);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  // Deep links (/discover?q=...) run once on mount so shared URLs work.
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    const initial = searchParams.get("q");
    if (initial && initial.trim() !== "") {
      setQuery(initial);
      void search(initial);
    }
  }, [search, searchParams]);

  return { query, setQuery, result, loading, error, searched, search };
}
