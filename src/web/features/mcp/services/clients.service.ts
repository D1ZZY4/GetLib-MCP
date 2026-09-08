import type { ClientsSnapshot } from "@/application/clients/clients.service";

export async function fetchClients(): Promise<ClientsSnapshot> {
  const response = await fetch("/api/management/clients");
  if (!response.ok) {
    throw new Error(`Clients API error: HTTP ${response.status}`);
  }
  return (await response.json()) as ClientsSnapshot;
}
