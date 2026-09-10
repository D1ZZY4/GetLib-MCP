import { checkEvidence, buildEvidenceBlock, type EvidenceCheck } from "@/server/mcp/utils/evidence";
import { withNotice } from "@/server/mcp/utils/guard";
import { parseExternal, safeJsonParse, externalSchemas } from "@/server/mcp/utils/validate-external";
import type { CompatSection } from "@/server/mcp/services/compat-sources";

/**
 * Capability seams of the compat use case. MDN/caniuse retrieval is
 * infrastructure injected here. Pure content transformation (evidence),
 * the cache, and shared protection/presentation (guard, validation
 * schemas) stay imported as cross-cutting technical infrastructure.
 */
export interface CompatDeps {
  resolveMdnCandidates: (feature: string) => Promise<string[]>;
  fetchBcdSection: (
    candidates: string[],
    feature: string,
    environments: string[] | undefined,
  ) => Promise<CompatSection | null>;
  fetchRenderedMdn: (
    candidates: string[],
    feature: string,
    topic: string,
    tokens: number,
  ) => Promise<CompatSection | null>;
  fetchCaniuse: (feature: string, tokens: number) => Promise<CompatSection | null>;
  fetchMdnSearchPage: (feature: string, topic: string, tokens: number) => Promise<CompatSection | null>;
  cacheGet: (key: string) => string | undefined;
  cacheSet: (key: string, value: string) => void;
}

export interface CompatInput {
  feature: string;
  environments?: string[];
  tokens: number;
}

export interface CompatApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  };
  resolved: boolean;
}

/**
 * Browser/runtime compatibility use case shared by the MCP tool and any
 * future consumer. Owns the full pipeline: cache envelope, MDN candidate
 * resolution, BCD section, rendered-MDN and caniuse fallbacks, search
 * page last resort, evidence and render. Transport adapters only
 * validate input, inject the live infrastructure adapters, and map this
 * result.
 */
export async function compatUseCase(input: CompatInput, deps: CompatDeps): Promise<CompatApplicationResult> {
  const { feature, environments, tokens } = input;
  // No extraction guard: `feature` is a web-platform feature description,
  // not a registry key - guarding it refused ordinary queries like
  // "does Safari support the full :has() selector list".
  const envFilter = environments?.map((e) => e.toLowerCase()).join(", ") ?? "";
  const cacheKey = `compat:${feature}:${envFilter}:${tokens}`;
  const cached = deps.cacheGet(cacheKey);
  if (typeof cached === "string") {
    const raw = safeJsonParse(cached);
    const envelope = raw ? parseExternal(externalSchemas.cacheEnvelope, raw) : null;
    if (envelope?.text) {
      return {
        response: {
          content: [{ type: "text", text: envelope.text }],
          ...(envelope.structuredContent ? { structuredContent: envelope.structuredContent } : {}),
        },
        resolved: true,
      };
    }
    // Pre-envelope cache entry - plain rendered text.
    if (envelope === null) {
      try {
        const legacy = JSON.parse(cached) as unknown;
        if (typeof legacy === "string") return { response: { content: [{ type: "text", text: legacy }] }, resolved: true };
      } catch {
        // Not JSON at all - fall through to plain text below.
      }
      return { response: { content: [{ type: "text", text: cached }] }, resolved: true };
    }
    return { response: { content: [{ type: "text", text: cached }] }, resolved: true };
  }

  const featureEncoded = encodeURIComponent(feature);
  const sections: CompatSection[] = [];
  let weakEvidence = false;
  const searchTopic = envFilter
    ? `${feature} ${envFilter} compatibility`
    : `${feature} browser support compatibility`;

  const candidates = await deps.resolveMdnCandidates(feature);
  const bcd = await deps.fetchBcdSection(candidates, feature, environments);
  if (bcd) sections.push(bcd);

  if (!bcd) {
    const rendered = await deps.fetchRenderedMdn(candidates, feature, searchTopic, Math.floor(tokens * 0.6));
    if (rendered) sections.push(rendered);
  }

  const isCssOrBrowser = /css|html|browser|webkit|layout|paint|grid|flex|animation|transition/i.test(feature);
  if (!bcd && (sections.length === 0 || isCssOrBrowser)) {
    const caniuse = await deps.fetchCaniuse(feature, Math.floor(tokens * 0.4));
    if (caniuse) sections.push(caniuse);
  }

  if (sections.length === 0) {
    const searchPage = await deps.fetchMdnSearchPage(feature, searchTopic, Math.floor(tokens * 0.4));
    if (searchPage) {
      weakEvidence = true;
      sections.push(searchPage);
    }
  }

  if (sections.length === 0) {
    const text = withNotice(
      [
        `# ${feature} - no compatibility evidence found`,
        "",
        `No MDN document or caniuse entry with verifiable data for "${feature}" could be fetched. Rather than guess, check directly:`,
        `- https://developer.mozilla.org/en-US/search?q=${featureEncoded}`,
        `- https://caniuse.com/?search=${featureEncoded}`,
        "",
        "Tip: use the exact feature name (e.g. 'container queries', 'Array.prototype.at') - marketing names often miss.",
      ].join("\n"),
    );
    return {
      response: {
        content: [{ type: "text", text }],
        structuredContent: { feature, environments: environments ?? [], sources: [], evidence: { ok: false, verdict: "miss" } },
      },
      resolved: true,
    };
  }

  const evidenceCheck: EvidenceCheck = checkEvidence(sections.map((s) => s.text).join("\n\n"), feature);
  const header = [
    `# Browser Compatibility: ${feature}`,
    envFilter ? `Focused on: ${envFilter}` : "",
    weakEvidence ? `> Evidence: Weak - only search results matched; verify in the linked pages.` : "",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const evidenceBlock = buildEvidenceBlock({
    sources: sections.map((s) => ({ url: s.url, sourceType: s.sourceType })),
    topic: feature,
    check: evidenceCheck,
  });
  const response = withNotice(`${header}\n\n${sections.map((s) => s.text).join("\n\n---\n\n")}${evidenceBlock}`);
  const structuredContent = {
    feature,
    environments: environments ?? [],
    sources: sections.map((s) => s.url),
    evidence: {
      // BCD data comes from the resolved MDN doc for this exact feature
      // (relevance-gated above) - authoritative regardless of how many
      // times the feature name recurs in the table text.
      ok: !!bcd || (evidenceCheck.ok && !weakEvidence),
      matchRatio: evidenceCheck.matchRatio,
      occurrences: evidenceCheck.occurrences,
      verdict: bcd ? "strong" : weakEvidence ? "weak" : evidenceCheck.ok ? "strong" : "weak",
    },
  };
  // Envelope keeps evidence.ok available on cache hits - a bare string
  // cache silently dropped the whole structuredContent block.
  deps.cacheSet(cacheKey, JSON.stringify({ text: response, structuredContent }));

  return { response: { content: [{ type: "text", text: response }], structuredContent }, resolved: true };
}
