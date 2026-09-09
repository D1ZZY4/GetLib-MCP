import { lookupById, lookupByAlias } from "../../sources/registry";
import { probeLlmsTxt } from "../resolve";
import { checkLibraryAccess, isSourceEnabled } from "../source-settings";
import { assertPublicUrl } from "../../utils/guard";
import type { LibraryEntry } from "../../types";

export interface DocsTarget {
  docsUrl: string;
  llmsTxtUrl: string | undefined;
  llmsFullTxtUrl: string | undefined;
  githubUrl: string | undefined;
  displayName: string;
}

export function resolveLibraryFromId(libraryId: string): LibraryEntry | null {
  // Disabled on the Sources page: the registry is invisible, so only
  // direct URL / npm: / pypi: ids below can still resolve.
  if (!isSourceEnabled("library-registry")) return null;
  // Direct registry ID, then alias
  return lookupById(libraryId) ?? lookupByAlias(libraryId) ?? null;
}

/**
 * Validate an npm / PyPI package name for safe URL construction.
 * Allows an optional @scope/ prefix and the standard name charset; rejects path
 * traversal (.., //), protocol-relative input, and over-long names. Preserves
 * valid scoped packages that encodeURIComponent would otherwise corrupt.
 */
export function isValidPackageName(pkg: string): boolean {
  if (!pkg || pkg.length > 214) return false;
  if (pkg.includes("..") || pkg.includes("//")) return false;
  return /^@?[a-z0-9._-]+(?:\/[a-z0-9._-]+)?$/i.test(pkg);
}

/**
 * Non-registry identifier kinds shared by gl_get_docs and gl_snippets.
 * Both tools document npm:/pypi:/URL ids in their own schemas, so the
 * validation and error messages live here once instead of diverging.
 */
export type BareTarget =
  | { kind: "npm"; pkg: string }
  | { kind: "pypi"; pkg: string }
  | { kind: "url"; url: string; hostname: string };

/**
 * Resolve an npm:/pypi:/URL libraryId without touching the registry.
 * Returns the parsed target, the verbatim error message for unusable
 * input, or null when the id is none of those three shapes (caller falls
 * through to its own registry-name handling).
 */
export function resolveBareTarget(libraryId: string): BareTarget | string | null {
  if (libraryId.startsWith("http://") || libraryId.startsWith("https://")) {
    try {
      assertPublicUrl(libraryId);
    } catch {
      return "URL not allowed: must be a public HTTPS address.";
    }
    return { kind: "url", url: libraryId, hostname: new URL(libraryId).hostname };
  }

  if (libraryId.startsWith("npm:")) {
    const pkg = libraryId.slice(4);
    if (!isValidPackageName(pkg)) return `Invalid npm package name: "${pkg}".`;
    return { kind: "npm", pkg };
  }

  if (libraryId.startsWith("pypi:")) {
    const pkg = libraryId.slice(5);
    if (!isValidPackageName(pkg)) return `Invalid PyPI package name: "${pkg}".`;
    return { kind: "pypi", pkg };
  }

  return null;
}

/**
 * Turn a libraryId into the URLs gl_get_docs should fetch. Returns a plain
 * message string when the identifier is unusable (invalid name, private target),
 * so the caller can surface it verbatim without throwing.
 */
export async function resolveDocsTarget(
  libraryId: string,
  entry: LibraryEntry | null,
): Promise<DocsTarget | string> {
  const blocked = checkLibraryAccess(libraryId, entry ? [entry.id, entry.name] : []);
  if (blocked) return blocked;
  if (entry) {
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
    };
  }

  const bare = { llmsTxtUrl: undefined, llmsFullTxtUrl: undefined, githubUrl: undefined };

  // npm:/pypi:/URL ids share validation and messages with gl_snippets via
  // resolveBareTarget. The dotted-name and bare-name fallbacks below stay
  // docs-specific.
  // Scheme-anchored: bare names like "http-errors" must fall through to
  // the package-name branches, not hard-fail as malformed URLs.
  const bareTarget = resolveBareTarget(libraryId);
  if (typeof bareTarget === "string") return bareTarget;
  if (bareTarget !== null) {
    if (bareTarget.kind === "url") {
      return { ...bare, docsUrl: bareTarget.url, displayName: bareTarget.hostname };
    }
    if (bareTarget.kind === "npm") {
      return { ...bare, docsUrl: `https://www.npmjs.com/package/${bareTarget.pkg}`, displayName: bareTarget.pkg };
    }
    return { ...bare, docsUrl: `https://pypi.org/project/${bareTarget.pkg}`, displayName: bareTarget.pkg };
  }

  // Try as URL or library name fallback
  if (libraryId.includes(".")) {
    const candidateUrl = `https://${libraryId}`;
    try {
      // Hard SSRF gate - refuse any libraryId that resolves to a private/internal target
      assertPublicUrl(candidateUrl);
    } catch {
      return `URL not allowed: "${libraryId}" resolves to a private/internal target. Must be a public host.`;
    }
    return { ...bare, docsUrl: candidateUrl, displayName: libraryId };
  }

  if (!isValidPackageName(libraryId)) return `Invalid library name: "${libraryId}".`;
  return { ...bare, docsUrl: `https://www.npmjs.com/package/${libraryId}`, displayName: libraryId };
}
