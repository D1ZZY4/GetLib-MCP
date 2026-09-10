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

export function transportLabel(transport: AssistantTransport): string {
  if (transport === "stdio") return "STDIO";
  if (transport === "sse") return "SSE";
  return "Streamable HTTP";
}

/** Clipboard write with a legacy fallback. Returns false when neither works. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "absolute";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      return true;
    } catch {
      return false;
    }
  }
}
