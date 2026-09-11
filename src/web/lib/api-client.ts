/**
 * Shared fetch boundary for all dashboard API calls.
 *
 * Every feature service goes through fetchJson so HTTP errors, API error
 * envelopes ({ error: { message } }), and oversized bodies are handled in
 * exactly one place instead of being reimplemented per service.
 */

const MAX_JSON_BYTES = 256 * 1024;
// Covers the 55s server tool budget (GETLIB_TOOL_TIMEOUT_MS) with margin,
// so dashboard runs surface server results instead of client timeouts.
const DEFAULT_TIMEOUT_MS = 60_000;

interface ApiErrorEnvelope {
  error?: { code?: string; message?: string };
}

/**
 * Trust boundary: the backend owns shape validation and callers assert
 * `T` matches the endpoint contract. Bodies are size-capped in bytes
 * (not UTF-16 units) on both success and error paths.
 */
export async function fetchJson<T>(path: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const callerSignal = init?.signal;
  const onCallerAbort = () => controller.abort(callerSignal?.reason);
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort(callerSignal.reason);
    else callerSignal.addEventListener("abort", onCallerAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(new Error(`Request to ${path} timed out after ${timeoutMs}ms.`)), timeoutMs);
  try {
    const response = await fetch(path, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new Error(await errorMessage(response, path));
    }
    const text = await response.text();
    if (byteLength(text) > MAX_JSON_BYTES) {
      throw new Error(`Response from ${path} exceeds the ${MAX_JSON_BYTES}-byte client limit.`);
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Response from ${path} did not return valid JSON.`);
    }
    return raw as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request to ${path} timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", onCallerAbort);
  }
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

async function errorMessage(response: Response, path: string): Promise<string> {
  try {
    const text = await response.text();
    // Same client limit as the success path: error bodies must not
    // become an unbounded read either.
    if (byteLength(text) > MAX_JSON_BYTES) return `Request to ${path} failed with HTTP ${response.status}.`;
    let body: unknown;
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      return `Request to ${path} failed with HTTP ${response.status}.`;
    }
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
