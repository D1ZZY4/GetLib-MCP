import { fetchJson, postJson } from "@/web/lib/api-client";
import type { ApiKeysSnapshot, CreatedApiKey } from "@/web/types/mcp";

export async function fetchApiKeys(): Promise<ApiKeysSnapshot> {
  return fetchJson<ApiKeysSnapshot>("/api/management/apikeys");
}

export async function createApiKey(name?: string, expiresAt?: string): Promise<CreatedApiKey> {
  return postJson<CreatedApiKey>("/api/management/apikeys", {
    ...(name !== undefined ? { name } : {}),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
  });
}

export async function updateApiKey(
  id: number,
  update: { name?: string; expiresAt?: string | null },
): Promise<{ renamed: number }> {
  return fetchJson<{ renamed: number }>("/api/management/apikeys", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...update }),
  });
}

export async function regenerateApiKey(id: number): Promise<CreatedApiKey> {
  return postJson<CreatedApiKey>("/api/management/apikeys/regenerate", { id });
}

export async function deleteApiKey(id: number): Promise<{ deleted: number }> {
  return fetchJson<{ deleted: number }>("/api/management/apikeys", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}
