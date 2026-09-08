import { fetchJson } from "@/web/lib/api-client";

export type AssistantTransport = "stdio" | "sse" | "streamable-http";

export interface AssistantEntry {
  id: string;
  name: string;
  description: string;
  configFile: string;
  snippet: string;
  remoteConfigFile?: string;
  remoteSnippet?: string;
  remoteTransport?: AssistantTransport;
  steps: string[];
  status: "connected" | "available";
  transports: AssistantTransport[];
}

export interface TransportModeDoc {
  id: AssistantTransport;
  label: string;
  explanation: string;
  status: "available" | "planned";
}

export interface InstallCatalog {
  assistants: AssistantEntry[];
  transports: TransportModeDoc[];
}

export function fetchInstallCatalog(): Promise<InstallCatalog> {
  return fetchJson<InstallCatalog>("/api/management/install");
}
