/**
 * Shared fetch boundary for all dashboard API calls.
 *
 * Every feature service goes through fetchJson so HTTP errors, API error
 * envelopes ({ error: { message } }), and oversized bodies are handled in
 * exactly one place instead of being reimplemented per service.
 */

const MAX_JSON_BYTES = 256 * 1024;

interface ApiErrorEnvelope {
  error?: { code?: string; message?: string };
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    throw new Error(await errorMessage(response, path));
  }
  const text = await response.text();
  if (text.length > MAX_JSON_BYTES) {
    throw new Error(`Response from ${path} exceeds the ${MAX_JSON_BYTES}-byte client limit.`);
  }
  return JSON.parse(text) as T;
}

async function errorMessage(response: Response, path: string): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorEnvelope;
    const message = body.error?.message;
    if (typeof message === "string" && message.length > 0) return message;
  } catch {
    // Fall through to the generic HTTP message below.
  }
  return `Request to ${path} failed with HTTP ${response.status}.`;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  return fetchJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function putJson<T>(path: string, body: unknown): Promise<T> {
  return fetchJson<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
