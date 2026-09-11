import { createHash } from "crypto";
import { FETCH_TIMEOUT_MS, SERVER_VERSION } from "../../constants";
import { config } from "../../config";
import { docCache, diskDocCache } from "../cache";
import { assertPublicUrl } from "../../utils/guard";
import { sanitizeContent } from "../../utils/sanitize";
import { log } from "../../utils/logger";
import { fetchSemaphore, hostSemaphore } from "./semaphore";
import { installSsrfGuard } from "./ssrf";

/** In-flight deduplication: prevents N concurrent fetches of the same URL. */
export const inFlightRequests = new Map<string, Promise<string | null>>();

/**
 * Single mem + disk + singleflight fetch-cache tier shared by every
 * content fetcher (markdown, Jina, GitHub, releases, examples).
 *
 * Mechanics are identical everywhere: memory hit wins, disk hit warms
 * memory, concurrent callers share the in-flight load, and only truthy
 * results are persisted via cacheDoc (which sanitizes once before
 * storage, SEC-009). Callers keep their own fetch bodies, TTLs, and any
 * pre-checks (circuit breakers stay outside so an open circuit never
 * even consults the cache path). doc-fetch.ts keeps its bespoke variant
 * because it also tracks the fetch origin via companion keys.
 */
export async function withFetchCache(
  key: string,
  ttlMs: number,
  load: () => Promise<string | null>,
): Promise<string | null> {
  const memCached = docCache.get(key);
  if (memCached) return memCached;

  const diskCached = await diskDocCache.get(key);
  if (diskCached) {
    docCache.set(key, diskCached);
    return diskCached;
  }

  // Double-check after the disk await: a concurrent caller may have
  // populated memory or registered the in-flight load while this caller
  // was suspended, and without this second look both would fetch.
  const memRecheck = docCache.get(key);
  if (memRecheck) return memRecheck;
  const inFlight = inFlightRequests.get(key);
  if (inFlight) return inFlight;

  const fetchPromise = (async (): Promise<string | null> => {
    const content = await load();
    if (content) cacheDoc(key, content, ttlMs);
    return content;
  })();

  inFlightRequests.set(key, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(key);
  }
}

const MAX_REDIRECTS = 5;

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

const USER_AGENT =
  `GetLib/${SERVER_VERSION} (docs-fetcher; +https://github.com/rm-rf-prod/getlib-mcp)`;
/**
 * Write fetched documentation CONTENT to memory + disk cache, sanitizing once
 * before storage so poisoned upstream content is never persisted raw (SEC-009).
 * Metadata writes (npm/pypi JSON, sitemap URL lists) must NOT use this - running
 * them through the injection-stripper would corrupt the JSON.
 */
export function cacheDoc(cacheKey: string, content: string, ttl: number): void {
  const clean = sanitizeContent(content);
  docCache.set(cacheKey, clean, ttl);
  void diskDocCache.set(cacheKey, clean, ttl);
}

/** Build Authorization header for GitHub API if GETLIB_GITHUB_TOKEN is set */
export function githubAuthHeaders(): Record<string, string> {
  const token = config.githubToken;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Cap remote response bodies so a malicious or misconfigured upstream cannot
 * exhaust memory by streaming gigabytes before truncation. Returns null when the
 * body exceeds `max` (by declared Content-Length or by streamed byte count).
 */
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

export async function readBodyCapped(res: Response, max = MAX_RESPONSE_BYTES): Promise<string | null> {
  const headers = (res as { headers?: { get?: (k: string) => string | null } }).headers;
  const declared = Number(headers?.get?.("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;
  const body = (res as { body?: ReadableStream<Uint8Array> | null }).body;
  if (!body || typeof body.getReader !== "function") {
    const text = await res.text();
    return text.length > max ? null : text;
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.length;
      if (total > max) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export async function fetchWithTimeout(
  url: string,
  ms = FETCH_TIMEOUT_MS,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  // Guarantee the SSRF-guarding dispatcher no matter which entry point
  // reached this fetch first (idempotent no-op after the first call).
  installSsrfGuard();
  // Host bulkhead first, then the global cap: acquiring globally first would
  // let queued same-host waiters occupy global slots while blocked.
  const hostSem = hostSemaphore(url);
  const hostAcquired = await hostSem?.acquire();
  if (hostSem && !hostAcquired) {
    throw new Error(`Host concurrency limit reached for ${url}`);
  }
  try {
    const globalAcquired = await fetchSemaphore.acquire();
    if (!globalAcquired) {
      throw new Error(`Global fetch concurrency limit reached for ${url}`);
    }
  } catch (err) {
    // Single release point: the throw above and any acquire rejection
    // both funnel here, so the host slot is freed exactly once.
    hostSem?.release();
    throw err;
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  // Once a successful response is returned, timer ownership moves to the body
  // stream - clearing it at header-receipt time would let a slow-drip body
  // hang callers indefinitely past the deadline.
  let timerHandedOff = false;
  try {
    let currentUrl = url;
    for (let hops = 0; hops <= MAX_REDIRECTS; hops++) {
      const res = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT, Accept: "text/plain,text/html,*/*", "Accept-Language": "en-US,en;q=0.9", ...extraHeaders },
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return res;
        currentUrl = new URL(location, currentUrl).href;
        try { assertPublicUrl(currentUrl); } catch (err) {
          log({ level: "warn", msg: "fetchWithTimeout.ssrf_redirect_blocked", url: currentUrl, error: err instanceof Error ? err.message : String(err) });
          return res;
        }
        continue;
      }
      const body = (res as { body?: ReadableStream<Uint8Array> | null }).body;
      if (!body || typeof body.getReader !== "function") return res;
      const reader = body.getReader();
      const wrapped = new ReadableStream<Uint8Array>({
        async pull(c) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              clearTimeout(id);
              c.close();
              return;
            }
            if (value) c.enqueue(value);
          } catch (err) {
            clearTimeout(id);
            c.error(err);
          }
        },
        cancel(reason) {
          clearTimeout(id);
          return reader.cancel(reason);
        },
      });
      timerHandedOff = true;
      return new Response(wrapped, { status: res.status, statusText: res.statusText, headers: res.headers });
    }
    throw new Error(`Too many redirects for ${url}`);
  } finally {
    if (!timerHandedOff) clearTimeout(id);
    fetchSemaphore.release();
    hostSem?.release();
  }
}
