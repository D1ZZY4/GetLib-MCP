import { JINA_BASE_URL, CACHE_TTLS } from "../../constants";
import { extractDomain, isCircuitOpen, recordSuccess, recordFailure } from "../circuit-breaker";
import { backoffDelayMs, sleep } from "./negative-cache";
import { assertPublicUrl } from "../../utils/guard";
import { log } from "../../utils/logger";
import { fetchWithTimeout, readBodyCapped, withFetchCache } from "./request";
import { isGarbageContent } from "../content-guards";

/** Fetch via Jina Reader - converts any URL to clean markdown */
export async function fetchViaJina(url: string): Promise<string | null> {
  try {
    assertPublicUrl(url);
  } catch (err) {
    log({ level: "warn", msg: "fetchViaJina.ssrf_blocked", url, error: err instanceof Error ? err.message : String(err) });
    return null;
  }

  const jinaDomain = extractDomain(JINA_BASE_URL);
  if (isCircuitOpen(jinaDomain)) return null;

  const jinaUrl = `${JINA_BASE_URL}/${url}`;
  const cacheKey = `jina:${url}`;

  return withFetchCache(cacheKey, CACHE_TTLS.JINA_RESULT, async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetchWithTimeout(jinaUrl, 25_000, {
          "X-Return-Format": "markdown",
          "X-Exclude-Selector": "nav,footer,aside,.sidebar,.ads,#comments,.cookie-banner,.cookie-consent,#cookie-notice,.newsletter-signup",
          "X-Wait-For-Selector": "main,article,.docs-content,[role=main]",
        });
        if (res.status === 429 || res.status === 503) {
          recordFailure(jinaDomain);
          if (attempt === 0) {
            await sleep(backoffDelayMs(0));
            continue;
          }
          return null;
        }
        if (!res.ok) {
          recordFailure(jinaDomain);
          return null;
        }
        const text = await readBodyCapped(res);
        if (text === null) {
          recordFailure(jinaDomain);
          log({ level: "warn", msg: "fetchViaJina.body_too_large", url });
          return null;
        }
        if (text.length < 100) return null;
        // Jina answers 200 even when the TARGET page 404'd or is a challenge/login
        // shell - rendered garbage must never be returned or cached as content.
        const garbage = isGarbageContent(text);
        if (garbage.garbage) {
          log({ level: "warn", msg: "fetchViaJina.garbage_rejected", url, reason: garbage.reason });
          recordSuccess(jinaDomain); // Jina itself worked - the target was bad
          return null;
        }
        recordSuccess(jinaDomain);
        return text;
      } catch {
        recordFailure(jinaDomain);
        if (attempt === 0) await sleep(backoffDelayMs(0));
      }
    }
    return null;
  });
}
