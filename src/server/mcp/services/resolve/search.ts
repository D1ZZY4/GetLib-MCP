import { fetchWithTimeout, githubAuthHeaders } from "../fetcher";
import { CACHE_TTLS } from "../../constants";
import { resolveCache } from "../cache";
import { readBodyCapped } from "../http/request";
import type { LibraryMatch } from "../../types";
import { log } from "../../utils/logger";
import { externalSchemas, parseExternal } from "../../utils/validate-external";
import { probeLlmsTxt } from "./llms-probe";

export async function searchNpm(query: string): Promise<LibraryMatch | null> {
  const cacheKey = `npm-search:${query}`;
  const cached = resolveCache.get(cacheKey);
  if (cached) return cached;

  try {
    const searchUrl = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=3`;
    const res = await fetchWithTimeout(searchUrl, 8000);
    if (!res.ok) return null;

    const text = await readBodyCapped(res, 128 * 1024);
    if (text === null) return null;
    let raw: unknown = null;
    try {
      raw = JSON.parse(text) as unknown;
    } catch {
      return null;
    }
    const data = parseExternal(externalSchemas.npmSearch, raw);
    const objects = data?.objects;
    if (!objects || objects.length === 0) return null;

    const firstObject = objects[0];
    if (!firstObject) return null;
    const pkg = firstObject.package;
    const homepage = (pkg.links?.homepage ?? "").replace(/\/+$/, "");
    const repoUrl = pkg.links?.repository;
    const githubUrl = repoUrl?.includes("github.com") ? repoUrl : undefined;

    const llmsProbe = homepage ? await probeLlmsTxt(homepage) : {};

    const result: LibraryMatch = {
      id: `npm:${pkg.name}`,
      name: pkg.name,
      description: pkg.description ?? "",
      docsUrl: homepage || `https://www.npmjs.com/package/${pkg.name}`,
      llmsTxtUrl: llmsProbe.llmsTxtUrl,
      ...(llmsProbe.llmsFullTxtUrl !== undefined && { llmsFullTxtUrl: llmsProbe.llmsFullTxtUrl }),
      githubUrl,
      score: 65,
      source: "npm",
    };

    resolveCache.set(cacheKey, result, CACHE_TTLS.RESOLVE);
    return result;
  } catch (err) {
    log({ level: "debug", msg: "resolve.external_lookup_failed", cacheKey, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function searchGitHub(query: string): Promise<LibraryMatch | null> {
  const cacheKey = `github-search:${query}`;
  const cached = resolveCache.get(cacheKey);
  if (cached) return cached;

  try {
    const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=3`;
    const res = await fetchWithTimeout(searchUrl, 8000, {
      Accept: "application/vnd.github.v3+json",
      ...githubAuthHeaders(),
    });
    if (!res.ok) return null;

    const text = await readBodyCapped(res, 128 * 1024);
    if (text === null) return null;
    let raw: unknown = null;
    try {
      raw = JSON.parse(text) as unknown;
    } catch {
      return null;
    }
    const data = parseExternal(externalSchemas.githubSearch, raw);
    const items = data?.items;
    if (!items || items.length === 0) return null;

    const repo = items[0];
    if (!repo) return null;
    const homepage = (repo.homepage ?? "").replace(/\/+$/, "");
    const docsUrl = homepage || repo.html_url;

    const llmsProbe = homepage ? await probeLlmsTxt(homepage) : {};

    const result: LibraryMatch = {
      id: `github:${repo.full_name}`,
      name: repo.full_name.split("/").pop() ?? repo.full_name,
      description: repo.description ?? "",
      docsUrl,
      llmsTxtUrl: llmsProbe.llmsTxtUrl,
      ...(llmsProbe.llmsFullTxtUrl !== undefined && { llmsFullTxtUrl: llmsProbe.llmsFullTxtUrl }),
      githubUrl: repo.html_url,
      score: 55,
      source: "github",
    };

    resolveCache.set(cacheKey, result, CACHE_TTLS.RESOLVE);
    return result;
  } catch (err) {
    log({ level: "debug", msg: "resolve.external_lookup_failed", cacheKey, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}
