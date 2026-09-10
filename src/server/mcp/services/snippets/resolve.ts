import { lookupById, lookupByAlias } from "../sources/registry";
import { checkLibraryAccess, isSourceEnabled } from "../services/source-settings";
import { resolveBareTarget } from "../services/docs/docs-resolve";

export interface SnippetTarget {
  library: string;
  displayName: string;
  docsUrl: string;
  llmsTxtUrl: string | undefined;
  llmsFullTxtUrl: string | undefined;
  githubUrl: string | undefined;
}

export function resolveLibraryEntry(libraryId: string) {
  if (!isSourceEnabled("library-registry")) return undefined;
  return lookupById(libraryId) ?? lookupByAlias(libraryId);
}

/**
 * Resolve a libraryId to the sources gl_snippets should index. Returns a plain
 * message string when the identifier is unusable, so the caller surfaces it verbatim.
 */
export function resolveSnippetTarget(libraryId: string): SnippetTarget | string {
  const entry = resolveLibraryEntry(libraryId);
  const blocked = checkLibraryAccess(libraryId, entry ? [entry.id, entry.name] : []);
  if (blocked) return blocked;
  if (entry) {
    return {
      library: entry.id,
      displayName: entry.name,
      docsUrl: entry.docsUrl,
      llmsTxtUrl: entry.llmsTxtUrl,
      llmsFullTxtUrl: entry.llmsFullTxtUrl,
      githubUrl: entry.githubUrl,
    };
  }

  const bare = { llmsTxtUrl: undefined, llmsFullTxtUrl: undefined, githubUrl: undefined };

  // npm:/pypi:/URL ids share validation and messages with gl_get_docs.
  const bareTarget = resolveBareTarget(libraryId);
  if (typeof bareTarget === "string") return bareTarget;
  if (bareTarget !== null) {
    if (bareTarget.kind === "url") {
      return { ...bare, library: libraryId, docsUrl: bareTarget.url, displayName: bareTarget.hostname };
    }
    if (bareTarget.kind === "npm") {
      return { ...bare, library: libraryId, docsUrl: `https://www.npmjs.com/package/${bareTarget.pkg}`, displayName: bareTarget.pkg };
    }
    return { ...bare, library: libraryId, docsUrl: `https://pypi.org/project/${bareTarget.pkg}`, displayName: bareTarget.pkg };
  }

  return `Could not resolve "${libraryId}". Run gl_resolve_library first.`;
}
