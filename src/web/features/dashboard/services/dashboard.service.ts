import type {
  DashboardStats,
  MockActivity,
  MockAttention,
  MockLibrary,
} from "../../../types/library";

export const mockLibraries: MockLibrary[] = [
  {
    id: "react",
    name: "react",
    installedVersion: "19.2.0",
    latestVersion: "19.2.0",
    status: "up-to-date",
    lastCheckedAt: "2026-09-06T09:00:00Z",
  },
  {
    id: "tailwindcss",
    name: "tailwindcss",
    installedVersion: "4.0.0",
    latestVersion: "4.1.13",
    status: "outdated",
    lastCheckedAt: "2026-09-06T09:00:00Z",
  },
  {
    id: "supabase-js",
    name: "@supabase/supabase-js",
    installedVersion: "2.57.4",
    latestVersion: "2.57.4",
    status: "up-to-date",
    lastCheckedAt: "2026-09-05T14:30:00Z",
  },
  {
    id: "mcp-sdk",
    name: "@modelcontextprotocol/sdk",
    installedVersion: "1.12.0",
    latestVersion: "1.17.5",
    status: "outdated",
    lastCheckedAt: "2026-09-05T14:30:00Z",
  },
  {
    id: "example-vuln",
    name: "example-legacy-auth",
    installedVersion: "1.4.2",
    latestVersion: "2.0.1",
    status: "vulnerable",
    lastCheckedAt: "2026-09-04T11:15:00Z",
  },
];

export const mockActivities: MockActivity[] = [
  {
    id: "act-1",
    kind: "resolve",
    title: "Resolved react",
    detail: "gl_resolve_library matched react to v19.2.0 docs",
    timestamp: "2026-09-06T09:12:00Z",
  },
  {
    id: "act-2",
    kind: "docs",
    title: "Viewed tailwindcss docs",
    detail: "gl_get_docs fetched Vite plugin setup guide",
    timestamp: "2026-09-06T08:47:00Z",
  },
  {
    id: "act-3",
    kind: "audit",
    title: "Audited 5 libraries",
    detail: "gl_audit found 1 vulnerable and 2 outdated packages",
    timestamp: "2026-09-05T14:32:00Z",
  },
  {
    id: "act-4",
    kind: "scan",
    title: "Scanned project imports",
    detail: "gl_auto_scan detected 5 direct dependencies",
    timestamp: "2026-09-05T14:28:00Z",
  },
];

export const mockAttentions: MockAttention[] = [
  {
    id: "att-1",
    libraryName: "example-legacy-auth",
    message: "Known auth bypass fixed in v2.0.1. Upgrade recommended.",
    severity: "high",
    installedVersion: "1.4.2",
    latestVersion: "2.0.1",
  },
  {
    id: "att-2",
    libraryName: "tailwindcss",
    message: "Minor release available with Vite plugin fixes.",
    severity: "medium",
    installedVersion: "4.0.0",
    latestVersion: "4.1.13",
  },
  {
    id: "att-3",
    libraryName: "@modelcontextprotocol/sdk",
    message: "New transports and tool listing improvements available.",
    severity: "low",
    installedVersion: "1.12.0",
    latestVersion: "1.17.5",
  },
];

export const mockStats: DashboardStats = {
  totalLibraries: mockLibraries.length,
  upToDate: mockLibraries.filter((lib) => lib.status === "up-to-date").length,
  outdated: mockLibraries.filter((lib) => lib.status === "outdated").length,
  vulnerable: mockLibraries.filter((lib) => lib.status === "vulnerable").length,
};
