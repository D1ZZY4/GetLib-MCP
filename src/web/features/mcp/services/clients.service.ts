import { fetchJson } from "@/web/lib/api-client";
import type { ClientsSnapshot } from "@/web/types/mcp";

export async function fetchClients(): Promise<ClientsSnapshot> {
  return fetchJson<ClientsSnapshot>("/api/management/clients");
}
