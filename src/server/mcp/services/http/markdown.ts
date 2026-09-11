import { CACHE_TTLS } from "../../constants";
import { convertHtmlToMarkdown } from "../../utils/html-to-md";
import { withFetchCache } from "./request";
import { tryFetch } from "./try-fetch";
import { fetchViaJina } from "./jina";
import { isGarbageContent } from "../content-guards";

/**
 * Docsify sites address pages via hash fragments (https://getpino.io/#/docs/web)
 * that never reach the server - a direct fetch always lands on the homepage
 * shell regardless of the fragment. The markdown source conventionally lives at
 * the fragment path + ".md" on the same origin/base path. Returns null for
 * non-hash-routed URLs.
 */
export function docsifyToRaw(url: string): string | null {
  const m = /^(https?:\/\/[^#]*?)\/?#\/(.+)$/.exec(url);
  const base = m?.[1];
  const rawFrag = m?.[2];
  if (!m || base === undefined || rawFrag === undefined) return null;
  let frag = rawFrag.replace(/[?].*$/, "").replace(/\/+$/, "");
  if (!frag) return null;
  if (!/\.(md|markdown)$/i.test(frag)) frag += ".md";
  return `${base}/${frag}`;
}

/**
 * Race direct HTML extraction against Jina Reader - first good result wins.
 * Use this when you need fast, reliable content and the URL might or might not need JS rendering.
 */
export async function fetchAsMarkdownRace(url: string): Promise<string | null> {
  const cacheKey = `md:${url}`;

  return withFetchCache(cacheKey, CACHE_TTLS.DOCS_PAGE, async () => {
    try {
      const docsifyRaw = docsifyToRaw(url);
      const result = await Promise.any([
        // Path 0: Docsify hash-route → raw markdown. For hash URLs the direct
        // path below would fetch the homepage shell (fragment never sent), so
        // when this is a docsify URL the raw .md replaces the direct attempt.
        (async () => {
          if (!docsifyRaw) throw new Error("not a docsify URL");
          const md = await tryFetch(docsifyRaw, 0);
          if (md && md.length >= 200 && !isGarbageContent(md).garbage) return md;
          throw new Error("docsify raw failed");
        })(),
        // Path 1: Direct fetch + HTML extraction (usually faster)
        (async () => {
          if (docsifyRaw) throw new Error("hash-routed URL - direct fetch returns homepage");
          const html = await tryFetch(url, 0);
          if (!html) throw new Error("no content");
          const tagDensity = (html.match(/<[a-z]/gi) ?? []).length / Math.max(html.length, 1);
          if (tagDensity < 0.005 && html.length > 100) {
            if (isGarbageContent(html).garbage) throw new Error("garbage content");
            return html;
          }
          const md = convertHtmlToMarkdown(html);
          if (md.length >= 200) {
            if (isGarbageContent(md).garbage) throw new Error("garbage content after extraction");
            return md;
          }
          throw new Error("extraction too short");
        })(),
        // Path 2: Jina Reader (handles JS-rendered sites)
        (async () => {
          const md = await fetchViaJina(url);
          if (md && md.length >= 100) return md;
          throw new Error("jina failed");
        })(),
      ]);

      return result;
    } catch {
      return null;
    }
  });
}
