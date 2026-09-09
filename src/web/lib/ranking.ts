/**
 * Shared library-fetch ranking. Used by the dashboard overview and the
 * statistics ranking view so sort order cannot drift between surfaces.
 * Pure and UI-independent: safe to import from any feature.
 */

export interface LibraryFetch {
  id: string;
  name: string;
  fetches: number;
}

export function rankLibraryFetches(fetches: LibraryFetch[], limit?: number): LibraryFetch[] {
  const ranked = [...fetches].sort((a, b) => b.fetches - a.fetches);
  return limit === undefined ? ranked : ranked.slice(0, limit);
}
