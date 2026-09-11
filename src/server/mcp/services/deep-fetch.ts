import type { FetchResult } from "../types";
import { fetchAsMarkdownRace, isIndexContent, rankIndexLinks, fetchSitemapUrls, hashContent } from "./fetcher";
import { log } from "../utils/logger";
import {
  DEEP_FETCH_MAX_PAGES,
  DEEP_FETCH_RELEVANCE_THRESHOLD,
  DEEP_FETCH_TIMEOUT_MS,
} from "../constants";
import { scoreTopicRelevance, extractInternalLinks, rankLinksForTopic, buildTopicUrls } from "./links";

export { extractInternalLinks, rankLinksForTopic } from "./links";

async function fetchFirstSuccessful(
  urls: string[],
  minLength = 300,
  signal?: AbortSignal,
): Promise<FetchResult | null> {
  if (urls.length === 0 || signal?.aborted) return null;

  try {
    return await Promise.any(
      urls.map(async (url) => {
        const content = await fetchAsMarkdownRace(url);
        if (content && content.length >= minLength) {
          return { content, url, sourceType: "deep-fetch" as const };
        }
        throw new Error("no content");
      }),
    );
  } catch {
    return null;
  }
}

/**
 * Index deep-link tactic shared by single-page consumers: when a fetch
 * result is still a link index, follow the top-ranked deep link and take
 * the first page with substantive content. Unlike deepFetchForTopic
 * (multi-page assemble with relevance gate and timeout), this returns
 * one page and never fabricates topic URLs - the depth policy stays with
 * the caller.
 */
export async function fetchFirstIndexDeepLink(
  content: string,
  topic: string,
  baseUrl: string,
): Promise<{ content: string; url: string } | null> {
  if (!isIndexContent(content)) return null;
  const deepLinks = rankIndexLinks(content, topic, baseUrl);
  for (const deepUrl of deepLinks) {
    const deepContent = await fetchAsMarkdownRace(deepUrl);
    if (deepContent && deepContent.length > 300) return { content: deepContent, url: deepUrl };
  }
  return null;
}

export async function fetchMultiplePages(
  urls: string[],
  maxPages: number,
  signal?: AbortSignal,
): Promise<Array<{ content: string; url: string }>> {
  if (signal?.aborted) return [];
  const batch = urls.slice(0, maxPages);
  const results = await Promise.allSettled(
    batch.map(async (url) => {
      if (signal?.aborted) throw new Error("aborted");
      const content = await fetchAsMarkdownRace(url);
      if (content && content.length >= 300) {
        return { content, url };
      }
      throw new Error("no content");
    }),
  );

  const pages: Array<{ content: string; url: string }> = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      pages.push(result.value);
    }
  }
  return pages;
}

function assemblePages(
  pages: Array<{ content: string; url: string }>,
): string {
  // Content-addressed dedup: a 32-bit hash can collide and silently drop
  // a valid paragraph, so reuse the shared SHA-256 content hash instead.
  const seenHashes = new Set<string>();
  return pages
    .map((p) => {
      const paras = p.content.split(/\n{2,}/);
      const unique = paras.filter((para) => {
        if (para.length < 50) return true;
        const hash = hashContent(para.trim());
        if (seenHashes.has(hash)) return false;
        seenHashes.add(hash);
        return true;
      });
      return `## Source: ${p.url}\n\n${unique.join("\n\n")}`;
    })
    .join("\n\n---\n\n");
}

export function splitTopics(topic: string): string[] {
  const parts = topic.split(/\s+(?:and|&|\+|vs\.?|or)\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [topic];
  return parts.filter((p) => p.length >= 3);
}

export async function deepFetchForTopic(
  initialResult: FetchResult,
  topic: string,
  docsUrl: string,
  urlPatterns?: string[],
  maxPages = DEEP_FETCH_MAX_PAGES,
  force = false,
  signal?: AbortSignal,
): Promise<FetchResult> {
  if (!topic || topic.trim().length === 0 || signal?.aborted) return initialResult;

  // force=true bypasses the cheap relevance early-exit. Used by the evidence
  // gate: scoreTopicRelevance accepts a single passing mention (per its test
  // contract), but when the FINAL extracted output fails the stricter
  // checkEvidence bar, tools re-run the pipeline here to hunt topic pages.
  if (!force) {
    const relevance = scoreTopicRelevance(initialResult.content, topic);
    if (relevance >= DEEP_FETCH_RELEVANCE_THRESHOLD) return initialResult;
  }

  const pipeline = async (): Promise<FetchResult> => {
    // Real links from an index/TOC (llms.txt) beat fabricated slug URLs - try
    // them FIRST. Guessed slugs mostly 404 and used to burn the deep-fetch
    // time budget before the reliable path ever ran.
    const aborted = () => controller.signal.aborted;
    if (isIndexContent(initialResult.content)) {
      if (aborted()) return initialResult;
      const ranked = rankIndexLinks(initialResult.content, topic, initialResult.url || docsUrl);
      const pages = await fetchMultiplePages(ranked, maxPages, controller.signal);
      if (pages.length > 0) {
        return {
          content: assemblePages(pages),
          url: pages[0]?.url ?? "",
          sourceType: "deep-fetch",
        };
      }
    }

    if (aborted()) return initialResult;
    const topicUrls = buildTopicUrls(docsUrl, topic, urlPatterns);
    if (topicUrls.length > 0) {
      const directHit = await fetchFirstSuccessful(topicUrls.slice(0, 6), 300, controller.signal);
      if (directHit) return directHit;
    }

    if (aborted()) return initialResult;
    const internalLinks = extractInternalLinks(initialResult.content, docsUrl);
    if (internalLinks.length > 0) {
      const ranked = rankLinksForTopic(internalLinks, topic);
      if (ranked.length > 0) {
        const pages = await fetchMultiplePages(
          ranked.map((l) => l.url),
          maxPages,
          controller.signal,
        );
        if (pages.length > 0) {
          return {
            content: assemblePages(pages),
            url: pages[0]?.url ?? "",
            sourceType: "deep-fetch",
          };
        }
      }
    }

    if (aborted()) return initialResult;
    const sitemapUrls = await fetchSitemapUrls(docsUrl);
    if (sitemapUrls.length > 0) {
      const sitemapLinks = sitemapUrls.map((url) => ({ url, text: url }));
      const ranked = rankLinksForTopic(sitemapLinks, topic);
      if (ranked.length > 0) {
        const pages = await fetchMultiplePages(
          ranked.map((l) => l.url),
          maxPages,
          controller.signal,
        );
        if (pages.length > 0) {
          return {
            content: assemblePages(pages),
            url: pages[0]?.url ?? "",
            sourceType: "deep-fetch",
          };
        }
      }
    }

    return initialResult;
  };

  // Cooperative cancellation: the timeout aborts the controller so no new
  // fan-out starts after the deadline (in-flight fetches still end via
  // their own per-request timeouts). An external signal aborts the same
  // way. The timer is cleared when the pipeline wins so it never fires
  // stray, and the listener is removed to avoid listener accumulation.
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      pipeline(),
      new Promise<FetchResult>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("deep-fetch timeout"));
        }, DEEP_FETCH_TIMEOUT_MS);
        if (typeof timer === "object" && timer !== null && "unref" in timer) {
          const unref = timer.unref;
          if (typeof unref === "function") unref.call(timer);
        }
      }),
    ]);
  } catch (err) {
    // Surface persistent timeouts so operators can see the deep-fetch budget is
    // too low or upstreams are slow; other errors fall through silently.
    if (err instanceof Error && err.message === "deep-fetch timeout") {
      log({ level: "warn", msg: "deep-fetch-timeout", topic, docsUrl, timeoutMs: DEEP_FETCH_TIMEOUT_MS });
    }
    return initialResult;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}
