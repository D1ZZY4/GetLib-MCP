import type { GlToolName } from "../services/intent/types";

/** Plain-language justification shown for each routing decision. */
export const ROUTING_RATIONALE: Partial<Record<GlToolName, string>> = {
  gl_auto_scan:
    "Your message looks like a project-wide invocation (no specific library named). `gl_auto_scan` walks the dependency manifests in the given project path and fetches the latest best practices for every detected library in one round-trip.",
  gl_best_practices:
    "You named a specific library, so `gl_best_practices` is the lowest-friction tool — it returns current production patterns, performance, security, and testing guidance for that one library.",
  gl_get_docs:
    "You provided either a URL or asked for direct docs. `gl_get_docs` fetches the raw library documentation, optionally filtered by topic. It chains after `gl_resolve_library` if needed.",
  gl_audit:
    "You asked for code-level issues. `gl_audit` scans the project source tree against 18+ issue categories (security, performance, accessibility, etc.) and returns each finding with a live, official-doc-sourced fix.",
  gl_migration:
    "You mentioned an upgrade or migration. `gl_migration` pulls the official migration guide plus breaking-change list for the named library, scoped by version range when supplied.",
  gl_changelog:
    "You asked for what's new / release notes. `gl_changelog` reads GitHub Releases first, then CHANGELOG.md, then the docs site for the most recent entries.",
  gl_compare:
    "Two or more libraries detected. `gl_compare` fetches each one's docs and presents them side-by-side scoped by criteria such as performance, TypeScript support, or bundle size.",
  gl_compat:
    "You're asking about browser / runtime compatibility. `gl_compat` merges MDN and caniuse data for the feature you named.",
  gl_examples:
    "You want real-world code. `gl_examples` searches public GitHub for usage of the library/pattern you named and returns the highest-quality snippets.",
  gl_search:
    "No specific library or scope detected. `gl_search` is the catch-all: any topic, any web standard, any best-practice page.",
  gl_resolve_library:
    "Resolution-only intent detected. `gl_resolve_library` confirms the library exists and returns the canonical ID + docs URL — call `gl_best_practices` or `gl_get_docs` next.",
  gl_snippets:
    "You asked for ranked code snippets. `gl_snippets` builds a Context7-compatible snippet index per library + version with disk caching.",
  gl_batch_resolve:
    "Multi-library lookup detected. `gl_batch_resolve` resolves up to 20 names in a single call.",
};

export const ROUTING_FALLBACK = "Routing fallback — call the recommended tool above.";
