import { isExtractionAttempt, withNotice, EXTRACTION_REFUSAL } from "@/server/mcp/utils/guard";
import { extractRelevantContent, sliceVersionBand } from "@/server/mcp/utils/extract";
import { checkEvidence, buildEvidenceBlock, type EvidenceCheck } from "@/server/mcp/utils/evidence";
import { computeQualityScore } from "@/server/mcp/utils/quality";
import { sanitizeContent } from "@/server/mcp/utils/sanitize";
import { readCacheEnvelope } from "@/server/mcp/utils/validate-external";
import type { ChangelogTarget } from "@/server/mcp/services/changelog-sources";

/**
 * Capability seams of the changelog use case. Target resolution,
 * changelog retrieval, and the cache envelope are infrastructure
 * details injected here. Pure content transformation (extract, slice,
 * sanitize, quality, evidence) and shared protection/presentation
 * (guard, cache, validation schemas) stay imported as cross-cutting
 * technical infrastructure.
 */
export interface ChangelogDeps {
  resolveChangelogTarget: (libraryId: string) => Promise<ChangelogTarget | string>;
  fetchChangelog: (target: ChangelogTarget) => Promise<{ raw: string | null; sourceUrl: string }>;
  cacheGet: (key: string) => string | undefined;
  cacheSet: (key: string, value: string) => void;
}

export interface ChangelogInput {
  libraryId: string;
  version?: string;
  tokens: number;
}

export interface ChangelogApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  };
  resolved: boolean;
}

/**
 * Changelog use case shared by the MCP tool and any future consumer.
 * Owns the full pipeline: extraction guard, cache envelope, target
 * resolution, retrieval, version-band slicing, ranking, quality and
 * evidence, render. Transport adapters only validate input, inject the
 * live infrastructure adapters, and map this result.
 */
export async function changelogUseCase(input: ChangelogInput, deps: ChangelogDeps): Promise<ChangelogApplicationResult> {
  const { libraryId, version, tokens } = input;
  if (isExtractionAttempt(libraryId)) {
    return { response: { content: [{ type: "text", text: EXTRACTION_REFUSAL }] }, resolved: true };
  }
  if (version && isExtractionAttempt(version)) {
    return { response: { content: [{ type: "text", text: EXTRACTION_REFUSAL }] }, resolved: true };
  }

  const cacheKey = `changelog:${libraryId}:${version ?? ""}:${tokens}`;
  const cached = deps.cacheGet(cacheKey);
  if (typeof cached === "string") {
    // Envelope, not a bare string: caching only the text made every
    // cache hit return a degraded structuredContent (no displayName,
    // sourceUrl, qualityScore or content). compat.ts already does this.
    const envelope = readCacheEnvelope(cached);
    if (envelope?.text && envelope.structuredContent) {
      return {
        response: {
          content: [{ type: "text", text: envelope.text }],
          structuredContent: { ...envelope.structuredContent, cached: true },
        },
        resolved: true,
      };
    }
    // Pre-envelope cache entry - fall through and refetch.
  }

  const target = await deps.resolveChangelogTarget(libraryId);
  if (typeof target === "string") {
    return { response: { content: [{ type: "text", text: target }] }, resolved: true };
  }
  const { displayName, githubUrl, docsUrl } = target;
  const { raw, sourceUrl } = await deps.fetchChangelog(target);

  if (!raw || raw.trim().length < 50) {
    const text = withNotice(
      `No changelog found for **${displayName}**.\n\nCheck the GitHub releases page directly: ${githubUrl ?? docsUrl}`,
    );
    return { response: { content: [{ type: "text", text }] }, resolved: true };
  }

  let content = sanitizeContent(raw);

  // Slice to the requested version band. Replaces a fragile first-match
  // includes() scan that could anchor on an unrelated mention of the number
  // and then grab a fixed 100-line window.
  if (version) {
    content = sliceVersionBand(content, version, version);
  }

  const { text, truncated } = extractRelevantContent(
    content,
    version ? `release ${version} changes` : "releases changes",
    tokens,
  );

  const { score: qualityScore, hints: qualityHints } = computeQualityScore(
    text,
    version ? `release ${version} changes` : "releases changes",
    "github-readme",
    version ? [version] : undefined,
  );
  const evidence: EvidenceCheck = version ? checkEvidence(text, `v${version.replace(/^v/, "")} release`) : checkEvidence(text, "");

  const header = [
    `# ${displayName} Changelog`,
    version ? `Filtered to: **${version}**` : "",
    `Source: ${sourceUrl}`,
    truncated ? "\n> Content truncated - use a specific version to narrow results." : "",
    version && qualityScore < 0.4 ? `\n> Quality: Low - ${qualityHints.join("; ") || "the fetched changelog may not cover this version."}` : "",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const evidenceBlock = buildEvidenceBlock({
    sources: [{ url: sourceUrl, sourceType: "changelog" }],
    ...(version ? { topic: `v${version.replace(/^v/, "")} release`, check: evidence } : {}),
  });

  const response = withNotice(`${header}\n\n${text}${evidenceBlock}`);
  const structuredContent = {
    libraryId,
    displayName,
    version: version ?? null,
    sourceUrl,
    truncated,
    qualityScore,
    qualityHints,
    content: text,
  };
  deps.cacheSet(cacheKey, JSON.stringify({ text: response, structuredContent }));

  return {
    response: {
      content: [{ type: "text", text: response }],
      structuredContent,
    },
    resolved: true,
  };
}
