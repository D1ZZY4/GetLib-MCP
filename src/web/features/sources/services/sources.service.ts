export interface SourceItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface SourceGroup {
  id: string;
  title: string;
  description: string;
  items: SourceItem[];
}

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterSelectDef {
  id: string;
  label: string;
  options: FilterOption[];
  defaultOptionId: string;
}

// MOCK ONLY: replace with /api sources when the backend lands.
export const mockSourceGroups: SourceGroup[] = [
  {
    id: "public",
    title: "Public sources",
    description: "Open sources available to every teamspace by default.",
    items: [
      {
        id: "public-repos",
        name: "Public Repositories",
        description: "Open-source repos from GitHub, GitLab, and Bitbucket.",
        enabled: true,
      },
      {
        id: "websites",
        name: "Websites",
        description: "Crawled docs, guides, and reference pages.",
        enabled: true,
      },
      {
        id: "llms-txt",
        name: "LLMs.txt",
        description: "LLM-optimized documentation files.",
        enabled: true,
      },
    ],
  },
  {
    id: "connected",
    title: "Connected sources",
    description: "Third-party connections owned by this teamspace.",
    items: [
      {
        id: "confluence",
        name: "Confluence",
        description: "Atlassian Confluence workspace pages.",
        enabled: false,
      },
      {
        id: "uploaded-files",
        name: "Uploaded Files",
        description: "Uploaded OpenAPI specs and PDFs.",
        enabled: true,
      },
    ],
  },
  {
    id: "private",
    title: "Private sources",
    description: "All private sources connected to this teamspace.",
    items: [
      {
        id: "private-all",
        name: "Private teamspace sources",
        description: "Includes private repos, drives, and internal wikis.",
        enabled: true,
      },
    ],
  },
];

export const mockFilterSelects: FilterSelectDef[] = [
  {
    id: "verification",
    label: "Verification",
    defaultOptionId: "all",
    options: [
      { id: "all", label: "All" },
      { id: "verified", label: "Verified only" },
    ],
  },
  {
    id: "trust-score",
    label: "Trust score",
    defaultOptionId: "all",
    options: [
      { id: "all", label: "All" },
      { id: "70", label: "70+" },
      { id: "85", label: "85+" },
    ],
  },
  {
    id: "updated-within",
    label: "Last updated within",
    defaultOptionId: "all",
    options: [
      { id: "all", label: "All" },
      { id: "7d", label: "7 days" },
      { id: "30d", label: "30 days" },
      { id: "90d", label: "90 days" },
    ],
  },
  {
    id: "stars",
    label: "Stars",
    defaultOptionId: "all",
    options: [
      { id: "all", label: "All" },
      { id: "100", label: "100+" },
      { id: "1000", label: "1k+" },
      { id: "10000", label: "10k+" },
    ],
  },
  {
    id: "licenses",
    label: "Licenses",
    defaultOptionId: "all",
    options: [
      { id: "all", label: "All" },
      { id: "permissive", label: "Permissive" },
      { id: "copyleft", label: "Copyleft" },
    ],
  },
  {
    id: "backlinks",
    label: "Backlinks",
    defaultOptionId: "all",
    options: [
      { id: "all", label: "All" },
      { id: "100", label: "100+" },
      { id: "1000", label: "1k+" },
    ],
  },
  {
    id: "referring-domains",
    label: "Referring domains",
    defaultOptionId: "all",
    options: [
      { id: "all", label: "All" },
      { id: "50", label: "50+" },
      { id: "200", label: "200+" },
    ],
  },
  {
    id: "organic-traffic",
    label: "Monthly organic traffic",
    defaultOptionId: "all",
    options: [
      { id: "all", label: "All" },
      { id: "10k", label: "10k+" },
      { id: "100k", label: "100k+" },
    ],
  },
];

export const mockBlockedLibraries: string[] = ["example-legacy-auth", "abandoned-widgets"];

export const mockWildcardLibraries: string[] = ["react", "@modelcontextprotocol/sdk"];
