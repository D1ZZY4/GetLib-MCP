import type { z } from "zod";
import { fetchWithTimeout, githubAuthHeaders } from "../fetcher";
import { CACHE_TTLS } from "../../constants";
import { resolveCache } from "../cache";
import { readBodyCapped } from "../http/request";
import type { LibraryMatch } from "../../types";
import { log } from "../../utils/logger";
import { externalSchemas, parseExternal } from "../../utils/validate-external";
import { probeLlmsTxt } from "./llms-probe";

interface LlmsProbe {
  llmsTxtUrl?: string;
  llmsFullTxtUrl?: string;
}

/**
 * Shared registry-search pipeline: cache check, bounded fetch, capped
 * body, schema validation, first-item mapping, llms.txt probe, cache
 * store. npm and GitHub differ only in endpoint, schema, and mapping -
 * the failure policy (null with a debug log on every miss) is one
 * implementation so the two providers cannot drift apart.
 */
interface RegistrySearchSpec<TData, TItem> {
  cacheKey: string;
  url: string;
  headers?: Record<string, string>;
  schema: z.ZodType<TData>;
  itemsOf: (data: TData) => readonly TItem[] | undefined;
  homepageOf: (item: TItem) => string;
  toMatch: (item: TItem, homepage: string, probe: LlmsProbe) => LibraryMatch;
}

async function searchRegistry<TData, TItem>(spec: RegistrySearchSpec<TData, TItem>): Promise<LibraryMatch | null> {
  const cached = resolveCache.get(spec.cacheKey);
  if (cached) return cached;

  try {
    const res = await fetchWithTimeout(spec.url, 8000, spec.headers);
    if (!res.ok) return null;

    const text = await readBodyCapped(res, 128 * 1024);
    if (text === null) return null;
    let raw: unknown = null;
    try {
      raw = JSON.parse(text) as unknown;
    } catch {
      return null;
    }
    const data = parseExternal(spec.schema, raw);
    const first = data ? spec.itemsOf(data)?.[0] : undefined;
    if (!first) return null;

    const homepage = spec.homepageOf(first);
    const probe = homepage ? await probeLlmsTxt(homepage) : {};
    const result = spec.toMatch(first, homepage, probe);

    resolveCache.set(spec.cacheKey, result, CACHE_TTLS.RESOLVE);
    return result;
  } catch (err) {
    log({ level: "debug", msg: "resolve.external_lookup_failed", cacheKey: spec.cacheKey, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function searchNpm(query: string): Promise<LibraryMatch | null> {
  return searchRegistry({
    cacheKey: `npm-search:${query}`,
    url: `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=3`,
    schema: externalSchemas.npmSearch,
    itemsOf: (data) => data.objects,
    homepageOf: (pkg) => (pkg.package.links?.homepage ?? "").replace(/\/+$/, ""),
    toMatch: (wrapper, homepage, llmsProbe) => {
      const pkg = wrapper.package;
      const repoUrl = pkg.links?.repository;
      return {
        id: `npm:${pkg.name}`,
        name: pkg.name,
        description: pkg.description ?? "",
        docsUrl: homepage || `https://www.npmjs.com/package/${pkg.name}`,
        llmsTxtUrl: llmsProbe.llmsTxtUrl,
        ...(llmsProbe.llmsFullTxtUrl !== undefined && { llmsFullTxtUrl: llmsProbe.llmsFullTxtUrl }),
        githubUrl: repoUrl?.includes("github.com") ? repoUrl : undefined,
        score: 65,
        source: "npm",
      };
    },
  });
}

export async function searchGitHub(query: string): Promise<LibraryMatch | null> {
  return searchRegistry({
    cacheKey: `github-search:${query}`,
    url: `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=3`,
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...githubAuthHeaders(),
    },
    schema: externalSchemas.githubSearch,
    itemsOf: (data) => data.items,
    homepageOf: (repo) => (repo.homepage ?? "").replace(/\/+$/, ""),
    toMatch: (repo, homepage, llmsProbe) => {
      return {
        id: `github:${repo.full_name}`,
        name: repo.full_name.split("/").pop() ?? repo.full_name,
        description: repo.description ?? "",
        docsUrl: homepage || repo.html_url,
        llmsTxtUrl: llmsProbe.llmsTxtUrl,
        ...(llmsProbe.llmsFullTxtUrl !== undefined && { llmsFullTxtUrl: llmsProbe.llmsFullTxtUrl }),
        githubUrl: repo.html_url,
        score: 55,
        source: "github",
      };
    },
  });
}
