import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { normalizeQueryYear } from "../utils/extract";
import { checkEvidence, buildEvidenceBlock } from "../utils/evidence";
import { DEFAULT_TOKEN_LIMIT, MAX_TOKEN_LIMIT } from "../constants";
import { withTelemetry } from "../services/telemetry";
import { collectSearchSources } from "../services/search/collect";
import { addWebSearchSources } from "../services/search/fetch-topic";

// Re-exported so callers that reason about search sourcing (gl_compat, gl_migration)
// and the existing test mocks keep a single stable import path.
export { findTopicUrls } from "../services/search/topic-match";
export { searchMDN, webSearch } from "../services/search/engines";
export { isAuthoritativeUrl } from "../services/search/url-rank";

const InputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(500)
    .describe(
      "What you want to know. Can be anything: 'latest React best practices', 'WCAG 2.2 focus indicators', 'OWASP SQL injection prevention', 'CSS container queries browser support', 'JWT security', 'HTTP/3 vs HTTP/2', 'Web Workers API'. No library name required.",
    ),
  tokens: z
    .number()
    .int()
    .min(1000)
    .max(MAX_TOKEN_LIMIT)
    .default(DEFAULT_TOKEN_LIMIT)
    .describe(`Max tokens to return (default: ${DEFAULT_TOKEN_LIMIT}, max: ${MAX_TOKEN_LIMIT})`),
});

const NO_RESULTS_HELP = [
  "**What to try next:**",
  "- Be more specific (e.g. 'React hooks best practices' instead of 'React')",
  "- Include the library name + topic (e.g. 'Next.js middleware authentication')",
  "- Try gl_resolve_library to find a specific library, then gl_get_docs",
  "- Try gl_get_docs with a direct URL as the libraryId",
].join("\n");

export function registerSearchTools(): void {
  const currentYear = new Date().getFullYear();
  defineTool({
    name: "gl_search",
      title: "Search Any Topic",
      description: `Search for latest best practices, docs, or guidance on ANY topic — no library name needed.

Current year: ${currentYear}. All searches are normalized to fetch ${currentYear} content.

Works for:
- Library best practices: "latest React patterns", "Next.js server actions"
- Web standards: "CSS container queries", "WebSocket API", "Fetch API"
- Security: "OWASP SQL injection prevention", "JWT security best practices", "CSP headers"
- Accessibility: "WCAG 2.2 focus indicators", "ARIA roles reference"
- Performance: "Core Web Vitals optimization", "LCP improvements"
- APIs & protocols: "REST API design", "HTTP/3 vs HTTP/2", "OpenAPI 3.1"
- Auth standards: "OAuth 2.1 PKCE", "WebAuthn passkeys", "OIDC"
- Infrastructure: "Docker best practices", "GitHub Actions CI/CD"
- Anything else: just ask

If the query names ONE specific library, prefer gl_resolve_library + gl_get_docs/gl_best_practices for version-accurate, registry-backed results — use gl_search for standards, cross-cutting topics, or when no library applies. For browser/runtime feature support use gl_compat; for GitHub code examples use gl_examples.

Say "use gl" or "gl search [topic]" to invoke.

Examples:
- gl_search({ query: "latest best practices" }) — auto-detects from project context
- gl_search({ query: "WCAG 2.2 keyboard navigation" })
- gl_search({ query: "SQL injection prevention ${currentYear}" })
- gl_search({ query: "CSS container queries browser support" })
- gl_search({ query: "React Server Components patterns" })`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      const { query: rawQuery, tokens } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_search", async (ctx) => {
        const query = normalizeQueryYear(rawQuery);
        const { results, webSearched } = await collectSearchSources(query, tokens);

        if (results.length === 0) {
          return {
            content: [{ type: "text", text: `No results found for: "${query}"\n\n${NO_RESULTS_HELP}` }],
          };
        }

        // Evidence-driven escalation — sources exist but combined coverage is weak:
        // add authoritative web sources once instead of shipping a thin answer.
        let combinedCheck = checkEvidence(results.map((r) => r.content).join("\n\n"), query);
        if (!combinedCheck.ok && !webSearched && results.length < 3) {
          await addWebSearchSources(query, results, Math.floor(tokens / 3), 2);
          combinedCheck = checkEvidence(results.map((r) => r.content).join("\n\n"), query);
        }

        const header = [
          `# Search: ${query}`,
          `> Found ${results.length} source${results.length > 1 ? "s" : ""}`,
          "",
          "---",
          "",
        ].join("\n");
        const body = results
          .map((r) => `## ${r.source}\n> Source: ${r.url}\n\n${r.content}\n\n---\n`)
          .join("\n");
        const evidenceBlock = buildEvidenceBlock({
          sources: results.map((r) => ({ url: r.url })),
          topic: query,
          check: combinedCheck,
        });

        ctx.resolved = results.length > 0;
        return {
          content: [{ type: "text", text: header + body + evidenceBlock }],
          structuredContent: {
            query,
            sources: results.map((r) => ({ name: r.source, url: r.url, content: r.content })),
            evidence: {
              ok: combinedCheck.ok,
              matchRatio: combinedCheck.matchRatio,
              occurrences: combinedCheck.occurrences,
              verdict: combinedCheck.ok ? "strong" : combinedCheck.matchRatio > 0 ? "weak" : "miss",
            },
          },
        };
      });
    },
  });
}
