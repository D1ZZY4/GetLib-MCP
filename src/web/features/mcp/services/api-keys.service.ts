import { fetchJson, postJson } from "@/web/lib/api-client";
import type { ApiKeysSnapshot, CreatedApiKey } from "@/web/types/mcp";

export async function fetchApiKeys(): Promise<ApiKeysSnapshot> {
  return fetchJson<ApiKeysSnapshot>("/api/management/apikeys");
}

export async function createApiKey(name: string): Promise<CreatedApiKey> {
  return postJson<CreatedApiKey>("/api/management/apikeys", { name });
}

export async function revokeApiKey(id: number): Promise<{ revoked: number }> {
  return fetchJson<{ revoked: number }>("/api/management/apikeys", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}
