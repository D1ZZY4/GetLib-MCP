import type { LibraryMatch } from "../types";
import { resolveCache } from "./cache";
import { assertPublicUrl } from "../utils/guard";
import { probeLlmsTxt } from "./resolve/llms-probe";
import { resolveFromNpm, resolveFromPypi, resolveFromCrates, resolveFromGo } from "./resolve/registries";
import { searchNpm, searchGitHub } from "./resolve/search";

export { probeLlmsTxt } from "./resolve/llms-probe";
export { extractGithubUrl, resolveFromNpm, resolveFromPypi, resolveFromCrates, resolveFromGo } from "./resolve/registries";
export { searchNpm, searchGitHub } from "./resolve/search";

export interface ResolvedLibrary {
  docsUrl: string;
  displayName: string;
  githubUrl?: string;
  llmsTxtUrl?: string;
  llmsFullTxtUrl?: string;
}

function buildResolved(
  docsUrl: string,
  displayName: string,
  githubUrl: string | undefined,
  llmsTxtUrl: string | undefined,
  llmsFullTxtUrl: string | undefined,
): ResolvedLibrary {
  const r: ResolvedLibrary = { docsUrl, displayName };
  if (githubUrl !== undefined) r.githubUrl = githubUrl;
  if (llmsTxtUrl !== undefined) r.llmsTxtUrl = llmsTxtUrl;
  if (llmsFullTxtUrl !== undefined) r.llmsFullTxtUrl = llmsFullTxtUrl;
  return r;
}

/**
 * Shared bare-name fallback pipeline used by both resolveDynamic and the
 * application resolve use case. Single ownership prevents the two npm/pypi
 * then crates/go then search sequences from drifting apart.
 *
 * Returns ordered candidates (npm, pypi, crates, go, npm-search, github)
 * with registry duplicates removed. Callers decide how many to keep.
 */
export async function resolveBareNameCandidates(name: string): Promise<LibraryMatch[]> {
  const candidates: LibraryMatch[] = [];
  const pushUnique = (match: LibraryMatch | null): void => {
    if (match && !candidates.some((m) => m.id === match.id)) candidates.push(match);
  };

  const [npmResult, pypiResult] = await Promise.all([
    resolveFromNpm(name),
    resolveFromPypi(name),
  ]);
  pushUnique(npmResult);
  pushUnique(pypiResult);

  if (candidates.length === 0) {
    const [cratesResult, goResult] = await Promise.all([
      resolveFromCrates(name),
      resolveFromGo(name),
    ]);
    pushUnique(cratesResult);
    pushUnique(goResult);
  }

  if (candidates.length === 0) {
    const [npmSearchResult, githubResult] = await Promise.all([
      searchNpm(name),
      searchGitHub(name),
    ]);
    pushUnique(npmSearchResult);
    pushUnique(githubResult);
  }

  return candidates;
}

/**
 * Resolve a dynamic library ID (npm:pkg, pypi:pkg, crates:pkg, go:module, URL, or bare name)
 * to docs metadata. Returns null if resolution fails entirely.
 */
export async function resolveDynamic(libraryId: string): Promise<ResolvedLibrary | null> {
  const cacheKey = `dynamic-resolve:${libraryId}`;
  const cached = resolveCache.get(cacheKey);
  if (cached) {
    return buildResolved(cached.docsUrl, cached.name, cached.githubUrl, cached.llmsTxtUrl, cached.llmsFullTxtUrl);
  }

  let match: LibraryMatch | null = null;

  if (libraryId.startsWith("npm:")) {
    match = await resolveFromNpm(libraryId.slice(4));
  } else if (libraryId.startsWith("pypi:")) {
    match = await resolveFromPypi(libraryId.slice(5));
  } else if (libraryId.startsWith("crates:")) {
    match = await resolveFromCrates(libraryId.slice(7));
  } else if (libraryId.startsWith("go:")) {
    match = await resolveFromGo(libraryId.slice(3));
  } else if (libraryId.startsWith("http://") || libraryId.startsWith("https://")) {
    try {
      assertPublicUrl(libraryId);
    } catch {
      return null;
    }
    const hostname = new URL(libraryId).hostname;
    const llmsProbe = await probeLlmsTxt(libraryId.replace(/\/+$/, ""));
    return buildResolved(libraryId, hostname, undefined, llmsProbe.llmsTxtUrl, llmsProbe.llmsFullTxtUrl);
  } else if (libraryId.includes(".") && !libraryId.includes(" ")) {
    // Looks like a hostname (e.g., "fastify.dev")
    const url = `https://${libraryId}`;
    try {
      assertPublicUrl(url);
    } catch {
      return null;
    }
    const llmsProbe = await probeLlmsTxt(url);
    return buildResolved(url, libraryId, undefined, llmsProbe.llmsTxtUrl, llmsProbe.llmsFullTxtUrl);
  } else {
    const candidates = await resolveBareNameCandidates(libraryId);
    match = candidates[0] ?? null;
  }

  if (!match) return null;

  return buildResolved(match.docsUrl, match.name, match.githubUrl, match.llmsTxtUrl, match.llmsFullTxtUrl);
}
