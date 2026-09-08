export type LibraryStatus = "up-to-date" | "outdated" | "vulnerable";

export interface MockLibrary {
  id: string;
  name: string;
  installedVersion: string;
  latestVersion: string;
  status: LibraryStatus;
  lastCheckedAt: string;
}

export type ActivityKind = "docs" | "resolve" | "audit" | "scan";

export interface MockActivity {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  timestamp: string;
}

export type AttentionSeverity = "high" | "medium" | "low";

export interface MockAttention {
  id: string;
  libraryName: string;
  message: string;
  severity: AttentionSeverity;
  installedVersion: string;
  latestVersion: string;
}

export interface DashboardStats {
  totalLibraries: number;
  upToDate: number;
  outdated: number;
  vulnerable: number;
}

export interface MockDiscoverLibrary {
  id: string;
  name: string;
  description: string;
  latestVersion: string;
  weeklyDownloads: string;
  tags: string[];
}

export type AssistantStatus = "connected" | "available";

export interface MockAssistant {
  id: string;
  name: string;
  description: string;
  configFile: string;
  snippet: string;
  steps: string[];
  status: AssistantStatus;
}

export interface MockSession {
  name: string;
  email: string;
}
