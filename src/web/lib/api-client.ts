/**
 * Shared fetch boundary for all dashboard API calls.
 *
 * Every feature service goes through fetchJson so HTTP errors, API error
 * envelopes ({ error: { message } }), and oversized bodies are handled in
 * exactly one place instead of being reimplemented per service.
 */

const MAX_JSON_BYTES = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;

interface ApiErrorEnvelope {
  error?: { code?: string; message?: string };
}

/**
 * Trust boundary: the backend owns shape validation. Without `guard` the
 * caller asserts `T` matches the endpoint contract. With `guard` a shape
 * mismatch throws instead of leaking a half-typed object. Per-service
 * guards can be added incrementally without touching existing callers.
 */
export async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  guard?: (value: unknown) => value is T,
): Promise<T> {
  const controller = new AbortController();
  const callerSignal = init?.signal;
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort(callerSignal.reason);
    else callerSignal.addEventListener("abort", () => controller.abort(callerSignal.reason), { once: true });
  }
  const timer = setTimeout(() => controller.abort(new Error(`Request to ${path} timed out after ${timeoutMs}ms.`)), timeoutMs);
  try {
    const response = await fetch(path, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new Error(await errorMessage(response, path));
    }
    const text = await response.text();
    if (text.length > MAX_JSON_BYTES) {
      throw new Error(`Response from ${path} exceeds the ${MAX_JSON_BYTES}-byte client limit.`);
    }
    const raw: unknown = JSON.parse(text);
    if (guard && !guard(raw)) {
      throw new Error(`Response from ${path} failed shape validation.`);
    }
    return raw as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request to ${path} timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function errorMessage(response: Response, path: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    const message =
      typeof body === "object" && body !== null ? (body as ApiErrorEnvelope).error?.message : undefined;
    if (typeof message === "string" && message.length > 0) return message;
  } catch {
    // Fall through to the generic HTTP message below.
  }
  return `Request to ${path} failed with HTTP ${response.status}.`;
}

export async function postJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  return fetchJson<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...init,
    },
  );
}

export async function putJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  return fetchJson<T>(
    path,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...init,
    },
  );
}
