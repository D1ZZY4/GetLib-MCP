import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { withTelemetry } from "../services/telemetry";
import { resolveChangelogTarget, fetchChangelog } from "../services/changelog-sources";
import { extractRelevantContent, sliceVersionBand } from "../utils/extract";
import { checkEvidence, buildEvidenceBlock } from "../utils/evidence";
import { computeQualityScore } from "../utils/quality";
import { sanitizeContent } from "../utils/sanitize";
import { isExtractionAttempt, withNotice, EXTRACTION_REFUSAL, withToolTimeout } from "../utils/guard";
import { docCache } from "../services/cache";
import { DEFAULT_TOKEN_LIMIT, MAX_TOKEN_LIMIT } from "../constants";

const InputSchema = z.object({
  libraryId: z
    .string()
    .min(1)
    .max(200)
    .describe("Library ID from gl_resolve_library, e.g. 'vercel/next.js'"),
  version: z
    .string()
    .max(50)
    .optional()
    .describe("Filter to a specific version prefix, e.g. '15' or 'v15.2.0'"),
  tokens: z
    .number()
    .int()
    .min(1000)
    .max(MAX_TOKEN_LIMIT)
    .default(DEFAULT_TOKEN_LIMIT)
    .describe("Max tokens for content"),
});

/** Returned when the whole pipeline exceeds the tool timeout — an actionable
 *  next step beats a hung call or an MCP-level timeout error. */
const TIMEOUT_RESPONSE = {
  content: [{ type: "text" as const, text: "Changelog fetch timed out. Retry, or open the library's GitHub releases page directly." }],
};

export function registerChangelogTools(): void {
  defineTool({
    name: "gl_changelog",
      title: "Fetch Library Changelog",
      description: `Fetch recent release notes and changelog for a library. Reads GitHub Releases API first, then CHANGELOG.md, then the docs site. Use before upgrading.

Use this for "what changed in version X" questions. For "how do I upgrade my code from vA to vB" — use gl_migration instead (it targets MIGRATION.md, UPGRADING.md, and upgrade guides with step-by-step instructions).`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      const { libraryId, version, tokens } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_changelog", async (ctx) => {
        ctx.resolved = true;
        return withToolTimeout(async () => {
          if (isExtractionAttempt(libraryId)) {
            return { content: [{ type: "text", text: EXTRACTION_REFUSAL }] };
          }
          if (version && isExtractionAttempt(version)) {
            return { content: [{ type: "text", text: EXTRACTION_REFUSAL }] };
          }

          const cacheKey = `changelog:${libraryId}:${version ?? ""}:${tokens}`;
          const cached = docCache.get(cacheKey);
          if (typeof cached === "string") {
            // Envelope, not a bare string: caching only the text made every
            // cache hit return a degraded structuredContent (no displayName,
            // sourceUrl, qualityScore or content). compat.ts already does this.
            try {
              const envelope = JSON.parse(cached) as {
                text?: string;
                structuredContent?: Record<string, unknown>;
              };
              if (typeof envelope.text === "string" && envelope.structuredContent) {
                return {
                  content: [{ type: "text", text: envelope.text }],
                  structuredContent: { ...envelope.structuredContent, cached: true },
                };
              }
            } catch {
              // Pre-envelope cache entry — fall through and refetch.
            }
          }

          const target = await resolveChangelogTarget(libraryId);
          if (typeof target === "string") {
            return { content: [{ type: "text", text: target }] };
          }
          const { displayName, githubUrl, docsUrl } = target;
          const { raw, sourceUrl } = await fetchChangelog(target);

          if (!raw || raw.trim().length < 50) {
            const text = withNotice(
              `No changelog found for **${displayName}**.\n\nCheck the GitHub releases page directly: ${githubUrl ?? docsUrl}`,
            );
            return { content: [{ type: "text", text }] };
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
          const evidence = version ? checkEvidence(text, `v${version.replace(/^v/, "")} release`) : checkEvidence(text, "");

          const header = [
            `# ${displayName} Changelog`,
            version ? `Filtered to: **${version}**` : "",
            `Source: ${sourceUrl}`,
            truncated ? "\n> Content truncated — use a specific version to narrow results." : "",
            version && qualityScore < 0.4 ? `\n> Quality: Low — ${qualityHints.join("; ") || "the fetched changelog may not cover this version."}` : "",
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
          docCache.set(cacheKey, JSON.stringify({ text: response, structuredContent }));

          return {
            content: [{ type: "text", text: response }],
            structuredContent,
          };
        }, TIMEOUT_RESPONSE);
      });
    }
  });
}

