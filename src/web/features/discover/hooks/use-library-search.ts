import { useMemo, useState } from "react";
import { useMockData } from "@/web/lib/mock";
import type { MockDiscoverLibrary } from "../types";
import { mockDiscoverLibraries } from "../services/discover.service";

export function useLibrarySearch() {
  const [query, setQuery] = useState("");
  const { data: catalog, loading } = useMockData(mockDiscoverLibraries);

  const results: MockDiscoverLibrary[] = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized === "") return catalog;
    return catalog.filter(
      (lib) =>
        lib.name.toLowerCase().includes(normalized) ||
        lib.description.toLowerCase().includes(normalized) ||
        lib.tags.some((tag) => tag.toLowerCase().includes(normalized)),
    );
  }, [query, catalog]);

  return { query, setQuery, results, loading };
}
