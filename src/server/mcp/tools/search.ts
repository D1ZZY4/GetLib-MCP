import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import {
  SEARCH_QUERY_MAX,
  SEARCH_TOKENS_DEFAULT,
  SEARCH_TOKENS_MAX,
  SEARCH_TOKENS_MIN,
  searchLibrariesUseCase,
} from "@/application/library/search.service";
import { withToolTimeout } from "../utils/guard";
import { timeoutResponse } from "./timeout";
import { nonBlankString } from "../utils/schemas";
import { withTelemetry } from "../services/telemetry";

// Re-exported so callers that reason about search sourcing (gl_compat, gl_migration)
// and the existing test mocks keep a single stable import path.
export { findTopicUrls } from "../services/search/topic-match";
export { searchMDN, webSearch } from "../services/search/engines";
export { isAuthoritativeUrl } from "../services/search/url-rank";

const InputSchema = z.object({
  query: nonBlankString(SEARCH_QUERY_MAX)
    .describe(
      "What you want to know. Can be anything: 'latest React best practices', 'WCAG 2.2 focus indicators', 'OWASP SQL injection prevention', 'CSS container queries browser support', 'JWT security', 'HTTP/3 vs HTTP/2', 'Web Workers API'. No library name required.",
    ),
  tokens: z
    .number()
    .int()
    .min(SEARCH_TOKENS_MIN)
    .max(SEARCH_TOKENS_MAX)
    .default(SEARCH_TOKENS_DEFAULT)
    .describe(`Max tokens to return (default: ${SEARCH_TOKENS_DEFAULT}, max: ${SEARCH_TOKENS_MAX})`),
});

const TIMEOUT_RESPONSE = timeoutResponse(
  "Search timed out. Retry with a narrower query.",
  {
    timedOut: true,
    query: "",
    sources: [] as Array<{ name: string; url: string; content: string }>,
    evidence: { ok: false, matchRatio: 0, occurrences: 0, verdict: "miss" as const },
  },
);

export function registerSearchTools(): void {
  const currentYear = new Date().getFullYear();
  defineTool({
    name: "gl_search",
      title: "Search Any Topic",
      description: `Search for latest best practices, docs, or guidance on ANY topic - no library name needed.

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

If the query names ONE specific library, prefer gl_resolve_library + gl_get_docs/gl_best_practices for version-accurate, registry-backed results - use gl_search for standards, cross-cutting topics, or when no library applies. For browser/runtime feature support use gl_compat; for GitHub code examples use gl_examples.

Say "use gl" or "gl search [topic]" to invoke.

Examples:
- gl_search({ query: "latest best practices" }) - auto-detects from project context
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
      const { query, tokens } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_search", async (ctx) => {
        return withToolTimeout(async () => {
          const { response, resolved } = await searchLibrariesUseCase({ query, tokens });
          ctx.resolved = resolved;
          return response;
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
