import { mockLibraries } from "@/web/features/dashboard/services/dashboard.service";

export interface UsageDay {
  date: string;
  requests: number;
}

export interface LibraryStatRow {
  id: string;
  name: string;
  installedVersion: string;
  latestVersion: string;
  status: string;
  docsPages: number;
}

export interface UsageStats {
  requestsUsed: number;
  docsPages: number;
  activeLibraries: number;
  successRate: number;
}

// MOCK ONLY: replace with aggregated /api stats when the backend lands.
export function getUsageStats(): UsageStats {
  const rows = getLibraryStatRows();
  return {
    requestsUsed: 99,
    docsPages: rows.reduce((total, row) => total + row.docsPages, 0),
    activeLibraries: rows.length,
    successRate: 99.2,
  };
}

export const mockLast10Days: UsageDay[] = [
  { date: "Aug 29", requests: 4 },
  { date: "Aug 30", requests: 7 },
  { date: "Aug 31", requests: 3 },
  { date: "Sep 1", requests: 9 },
  { date: "Sep 2", requests: 12 },
  { date: "Sep 3", requests: 6 },
  { date: "Sep 4", requests: 11 },
  { date: "Sep 5", requests: 15 },
  { date: "Sep 6", requests: 8 },
  { date: "Sep 7", requests: 24 },
];

export interface LibraryFetch {
  id: string;
  name: string;
  fetches: number;
}

// MOCK ONLY: replace with aggregated /api stats when the backend lands.
export const mockLibraryFetches: LibraryFetch[] = [
  { id: "react", name: "react", fetches: 42 },
  { id: "tailwindcss", name: "tailwindcss", fetches: 31 },
  { id: "supabase-js", name: "@supabase/supabase-js", fetches: 18 },
  { id: "mcp-sdk", name: "@modelcontextprotocol/sdk", fetches: 12 },
  { id: "example-vuln", name: "example-legacy-auth", fetches: 4 },
];

const MOCK_DOCS_PAGES: Record<string, number> = {
  react: 48,
  tailwindcss: 36,
  "supabase-js": 29,
  "mcp-sdk": 22,
  "example-vuln": 6,
};

export function getLibraryStatRows(): LibraryStatRow[] {
  return mockLibraries.map((lib) => ({
    id: lib.id,
    name: lib.name,
    installedVersion: lib.installedVersion,
    latestVersion: lib.latestVersion,
    status: lib.status,
    docsPages: MOCK_DOCS_PAGES[lib.id] ?? 0,
  }));
}
