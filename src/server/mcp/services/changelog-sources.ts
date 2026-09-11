import { fetchGitHubReleases, fetchGitHubContent, fetchAsMarkdownRace } from "./fetcher";
import { lookupById, lookupByAlias } from "../sources/registry";
import { resolveDynamic } from "./resolve";
import { checkLibraryAccess } from "./source-settings";

export interface ChangelogTarget {
  displayName: string;
  githubUrl: string | undefined;
  docsUrl: string;
}

/** Resolve a libraryId to changelog sources, or a message when it cannot be resolved. */
export async function resolveChangelogTarget(libraryId: string): Promise<ChangelogTarget | string> {
  const entry = lookupById(libraryId) ?? lookupByAlias(libraryId);
  if (entry) {
    const blocked = checkLibraryAccess(libraryId, [entry.id, entry.name]);
    if (blocked) return blocked;
    return { displayName: entry.name, githubUrl: entry.githubUrl, docsUrl: entry.docsUrl };
  }
  const resolved = await resolveDynamic(libraryId);
  if (!resolved) return `Could not resolve "${libraryId}". Try gl_resolve_library first.`;
  // Fuzzy fallback guard: dynamic resolution latches onto near-miss repos
  // for garbage input ("fictional-xyz-999" -> some user's "fictional"
  // repo). Refuse to build changelog URLs from a name the caller never
  // asked for - an invented GitHub URL is worse than a clean miss.
  if (!matchesRequestedName(libraryId, resolved.displayName)) {
    return `Could not resolve "${libraryId}". Try gl_resolve_library first.`;
  }
  const blocked = checkLibraryAccess(libraryId, [resolved.displayName]);
  if (blocked) return blocked;
  return { displayName: resolved.displayName, githubUrl: resolved.githubUrl, docsUrl: resolved.docsUrl };
}

/**
 * True when a dynamically resolved display name plausibly denotes the
 * requested identifier. Compares alphanumeric-folded forms so scoped,
 * punctuated, and cased variants still match ("@scope/pkg",
 * "Next.js", "npm:express"). Bare containment either way is NOT
 * enough on its own: "fictional-xyz-999" contains "fictional"
 * without denoting it, so the overlapping part must dominate the
 * requested name.
 */
export function matchesRequestedName(requested: string, resolvedName: string): boolean {
  const fold = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Explicit ecosystem prefixes address a registry, not a name - compare
  // the bare package name on the requested side.
  const want = fold(requested).replace(/^(npm|pypi|crates|go)/, "");
  const got = fold(resolvedName);
  if (want.length < 2 || got.length === 0) return false;
  if (!got.includes(want) && !want.includes(got)) return false;
  const overlap = got.includes(want) ? want.length : got.length;
  return overlap / want.length >= 0.8;
}

/** GitHub Releases, then CHANGELOG.md, then the docs site's changelog page. */
export async function fetchChangelog(
  target: ChangelogTarget,
): Promise<{ raw: string | null; sourceUrl: string }> {
  const { githubUrl, docsUrl } = target;

  if (githubUrl) {
    const releases = await fetchGitHubReleases(githubUrl);
    if (releases) return { raw: releases, sourceUrl: `${githubUrl}/releases` };

    const changelogFile = await fetchGitHubContent(githubUrl, "CHANGELOG.md");
    if (changelogFile) return { raw: changelogFile.content, sourceUrl: changelogFile.url };
  }

  const docsChangelog = `${docsUrl}/changelog`;
  return { raw: await fetchAsMarkdownRace(docsChangelog), sourceUrl: docsChangelog };
}
