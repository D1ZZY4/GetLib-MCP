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
  const blocked = checkLibraryAccess(libraryId, [resolved.displayName]);
  if (blocked) return blocked;
  return { displayName: resolved.displayName, githubUrl: resolved.githubUrl, docsUrl: resolved.docsUrl };
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
