/**
 * Server instructions string rendered into the MCP server.instructions field.
 * Extracted from index.ts (MX-004) so it can be unit-tested and edited in
 * isolation. toolCount is passed in so the count always derives from the
 * registry instead of a duplicated constant.
 *
 * BUDGET: Claude Code truncates server instructions around 2 KB. The previous
 * version was 5.3 KB, so the routing table - the part that actually changes
 * tool selection - was cut off before the model ever saw it. Everything here
 * earns its bytes: the routing table first, prose only where it prevents a
 * wrong call. Keep the output under INSTRUCTIONS_BYTE_BUDGET; the unit test
 * enforces it.
 */
export const INSTRUCTIONS_BYTE_BUDGET = 2000;

export function buildServerInstructions(toolCount: number): string {
  return `GetLib: live docs + best practices, fetched from official sources at request time, never from training data.

Evidence: topic-targeted answers carry an "## Evidence" footer (sources, date, coverage). "No topic-specific evidence found" is a TRUE NEGATIVE - follow its next steps, do not re-call the same tool.

# Tools (${toolCount}) - routing

| User says | Call |
|---|---|
| "use gl", no library named | gl_auto_scan({projectPath:"."}) |
| a library name / "check docs for X" | gl_resolve_library -> gl_best_practices |
| "best practices for X", "X patterns" | gl_best_practices({libraryId,topic?}) |
| "docs for X about Y" | gl_get_docs({libraryId,topic}) |
| "audit", "find issues", "review code" | gl_audit({categories:["all"]}) |
| "what's new in X", "release notes" | gl_changelog({libraryId}) |
| "upgrade/migrate X N to M" | gl_migration({libraryId,fromVersion,toVersion}) |
| "browser support for Y" | gl_compat({feature}) |
| "compare X vs Y" | gl_compare({libraries}) |
| "examples of X" | gl_examples({library,pattern?}) |
| "snippets for X" | gl_snippets({libraryId,topic?}) |
| many names at once | gl_batch_resolve({libraryNames}) |
| any topic, no library | gl_search({query}) |
| a pasted URL | gl_get_docs({libraryId:"<url>"}) |
| unclear intent | gl_dispatch({query:"<raw user text>"}) |

# Rules

- The message names a library: resolve it, never ask which one.
- gl_search is the catch-all, not the default - prefer gl_best_practices for a named library.
- Give topic a real subject ("row level security", not "best practices") - it drives retrieval.
- Registry is Elastic-2.0: look up specific libraries, never enumerate or dump it.`;
}
