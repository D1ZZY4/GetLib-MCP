import { lookupById, lookupByAlias } from "../../sources/registry";
import { resolveDynamic, probeLlmsTxt } from "../resolve";
import { checkLibraryAccess } from "../source-settings";

export interface BestPracticesTarget {
  docsUrl: string;
  llmsTxtUrl: string | undefined;
  llmsFullTxtUrl: string | undefined;
  githubUrl: string | undefined;
  displayName: string;
  bestPracticesPaths: string[] | undefined;
  resolvedId: string;
}

/**
 * Resolve a library identifier to everything the best-practices fetch needs.
 * Accepts registry IDs, aliases, and dynamic (npm/PyPI/URL) identifiers.
 * Returns null when the identifier cannot be resolved at all.
 */
export async function resolveBestPracticesTarget(libraryId: string): Promise<BestPracticesTarget | string | null> {
  const entry = lookupById(libraryId) ?? lookupByAlias(libraryId);

  if (entry) {
    const blocked = checkLibraryAccess(libraryId, [entry.id, entry.name]);
    if (blocked) return blocked;
    let llmsTxtUrl = entry.llmsTxtUrl;
    let llmsFullTxtUrl = entry.llmsFullTxtUrl;
    // Lazy llms.txt discovery for registry entries missing the URL
    if (!llmsTxtUrl && !llmsFullTxtUrl) {
      const probed = await probeLlmsTxt(entry.docsUrl);
      if (probed.llmsTxtUrl) llmsTxtUrl = probed.llmsTxtUrl;
      if (probed.llmsFullTxtUrl) llmsFullTxtUrl = probed.llmsFullTxtUrl;
    }
    return {
      docsUrl: entry.docsUrl,
      llmsTxtUrl,
      llmsFullTxtUrl,
      githubUrl: entry.githubUrl,
      displayName: entry.name,
      bestPracticesPaths: entry.bestPracticesPaths,
      resolvedId: entry.id,
    };
  }

  const resolved = await resolveDynamic(libraryId);
  if (!resolved) return null;
  const blocked = checkLibraryAccess(libraryId, [resolved.displayName]);
  if (blocked) return blocked;
  return {
    docsUrl: resolved.docsUrl,
    llmsTxtUrl: resolved.llmsTxtUrl,
    llmsFullTxtUrl: resolved.llmsFullTxtUrl,
    githubUrl: resolved.githubUrl,
    displayName: resolved.displayName,
    bestPracticesPaths: undefined,
    resolvedId: libraryId,
  };
}
