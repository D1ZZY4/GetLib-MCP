import { isExtractionAttempt, withNotice, EXTRACTION_REFUSAL } from "@/server/mcp/utils/guard";
import { matchesRequestedName } from "@/server/mcp/services/changelog-sources";
import { isExplicitTarget } from "./best-practices.service";
import { extractRelevantContent, sliceVersionBand } from "@/server/mcp/utils/extract";
import { checkEvidence, buildEvidenceBlock } from "@/server/mcp/utils/evidence";
import { verdictForTopic } from "@/domain/evidence/verdict";
import { sanitizeContent } from "@/server/mcp/utils/sanitize";
import { computeQualityScore } from "@/server/mcp/utils/quality";
import type { LibraryEntry } from "@/server/mcp/types";
import type { ResolvedLibrary } from "@/server/mcp/services/resolve";
import type { MigrationSection } from "@/server/mcp/services/migration-sources";

/**
 * Capability seams of the migration use case. Registry lookup, dynamic
 * resolution, and migration-guide retrieval are infrastructure injected
 * here. Pure content transformation (slice, sanitize, extract, quality,
 * evidence) and shared protection stay imported as cross-cutting
 * technical infrastructure.
 */
export interface MigrationDeps {
  lookupById: (id: string) => LibraryEntry | null | undefined;
  lookupByAlias: (alias: string) => LibraryEntry | null | undefined;
  resolveDynamic: (libraryId: string) => Promise<ResolvedLibrary | null>;
  checkLibraryAccess: (libraryId: string, resolvedNames?: string[]) => string | null;
  fetchVersionGuide: (docsUrl: string, toVersion: string) => Promise<MigrationSection | null>;
  fetchGitHubMigrationDocs: (
    githubUrl: string,
    fromVersion: string | undefined,
    toVersion: string | undefined,
  ) => Promise<MigrationSection[]>;
  fetchConventionalUpgradeDocs: (docsUrl: string) => Promise<MigrationSection | null>;
  searchForUpgradeGuide: (
    displayName: string,
    docsUrl: string,
    fromVersion: string | undefined,
    toVersion: string | undefined,
  ) => Promise<MigrationSection | null>;
}

export interface MigrationInput {
  libraryId: string;
  fromVersion?: string;
  toVersion?: string;
  tokens: number;
}

export interface MigrationApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  };
  resolved: boolean;
}

/**
 * Migration-guide use case shared by the MCP tool and any future
 * consumer. Owns the full pipeline: extraction guard, registry then
 * dynamic resolution, version guide, GitHub migration docs,
 * conventional upgrade docs, upgrade-guide search, version-band
 * slicing, ranking, quality and evidence, render. Transport adapters
 * only validate input, inject the live infrastructure adapters, and
 * map this result.
 */
export async function migrationUseCase(input: MigrationInput, deps: MigrationDeps): Promise<MigrationApplicationResult> {
  const { libraryId, fromVersion, toVersion, tokens } = input;
  if (isExtractionAttempt(libraryId)) {
    return { response: { content: [{ type: "text", text: EXTRACTION_REFUSAL }] }, resolved: true };
  }

  const entry = deps.lookupById(libraryId) ?? deps.lookupByAlias(libraryId);
  const resolved = entry
    ? { docsUrl: entry.docsUrl, githubUrl: entry.githubUrl, displayName: entry.name, resolvedId: entry.id }
    : await deps.resolveDynamic(libraryId).then((r) =>
        r ? { docsUrl: r.docsUrl, githubUrl: r.githubUrl, displayName: r.displayName, resolvedId: libraryId } : null,
      );
  if (!resolved) {
    return {
      response: {
        content: [{
          type: "text",
          text: `Could not resolve "${libraryId}". Try gl_resolve_library first to find the correct ID.`,
        }],
      },
      resolved: false,
    };
  }
  // Fuzzy-identity guard for the dynamic fallback: it latches onto
  // near-miss repos for garbage input, and every fetch below would then
  // launder that mismatch into an authoritative-looking guide. Explicit
  // targets (prefixes, URLs, hostnames) skip the gate - the user chose
  // them deliberately.
  if (!entry && !isExplicitTarget(libraryId) && !matchesRequestedName(libraryId, resolved.displayName)) {
    return {
      response: {
        content: [{
          type: "text",
          text: `Could not resolve "${libraryId}". Try gl_resolve_library first to find the correct ID.`,
        }],
      },
      resolved: false,
    };
  }
  const blocked = deps.checkLibraryAccess(
    libraryId,
    entry ? [entry.id, entry.name] : [resolved.displayName],
  );
  if (blocked) {
    return { response: { content: [{ type: "text", text: blocked }] }, resolved: false };
  }
  const { docsUrl, githubUrl, displayName, resolvedId } = resolved;

  const sections: MigrationSection[] = [];
  const topic = [
    "migration",
    "upgrade",
    "breaking changes",
    fromVersion ? `v${fromVersion.replace(/^v/, "")}` : "",
    toVersion ? `v${toVersion.replace(/^v/, "")}` : "",
  ].filter(Boolean).join(" ");

  if (toVersion) {
    const guide = await deps.fetchVersionGuide(docsUrl, toVersion);
    if (guide) sections.push(guide);
  }

  if (githubUrl) {
    sections.push(...(await deps.fetchGitHubMigrationDocs(githubUrl, fromVersion, toVersion)));
  }

  if (sections.length === 0) {
    const conventional = await deps.fetchConventionalUpgradeDocs(docsUrl);
    if (conventional) sections.push(conventional);
  }

  if (!sections.some((s) => !s.source.includes("Releases"))) {
    const searched = await deps.searchForUpgradeGuide(displayName, docsUrl, fromVersion, toVersion);
    if (searched) sections.unshift(searched);
  }

  if (sections.length === 0) {
    return {
      response: {
        content: [{
          type: "text",
          text: `No migration guides found for "${displayName}". Try gl_changelog for release notes, or gl_get_docs with topic "migration".`,
        }],
      },
      resolved: false,
    };
  }

  const combined = sections.map((s) => `## ${s.source}\n\n${s.content}`).join("\n\n---\n\n");

  // Slice to the requested version band BEFORE ranking - this is what stops
  // ancient sections (e.g. Next.js v8-v11) reaching the BM25 pass at all.
  const banded = (fromVersion || toVersion)
    ? sliceVersionBand(combined, fromVersion, toVersion)
    : combined;

  const { text, truncated } = extractRelevantContent(sanitizeContent(banded), topic, tokens);
  const targetVersions = [fromVersion, toVersion].filter((v): v is string => typeof v === "string" && v.length > 0);
  const { score: qualityScore, hints: qualityHints } = computeQualityScore(text, topic, "github-readme", targetVersions);

  const evidence = checkEvidence(text, topic);
  const header = [
    `# ${displayName} - Migration Guide`,
    fromVersion || toVersion
      ? `> ${fromVersion ? `From: v${fromVersion.replace(/^v/, "")}` : ""}${toVersion ? ` To: v${toVersion.replace(/^v/, "")}` : ""}`
      : "",
    `> Sources: ${sections.map((s) => s.source).join(", ")}`,
    truncated ? "> Note: Response truncated. Specify fromVersion/toVersion for focused results." : "",
    qualityScore < 0.4 ? `> Quality: Low - ${qualityHints.join("; ") || "verify against the official upgrade guide."}` : "",
    "",
    "---",
    "",
  ].filter(Boolean).join("\n");

  const evidenceBlock = buildEvidenceBlock({
    sources: sections.map((s) => ({ url: s.source })),
    topic,
    check: evidence,
  });

  return {
    response: {
      content: [{ type: "text", text: withNotice(header + text + evidenceBlock) }],
      structuredContent: {
        libraryId: resolvedId,
        displayName,
        fromVersion,
        toVersion,
        sources: sections.map((s) => s.source),
        truncated,
        qualityScore,
        qualityHints,
        evidence: {
          ok: evidence.ok,
          matchRatio: evidence.matchRatio,
          occurrences: evidence.occurrences,
          verdict: verdictForTopic(evidence, topic),
        },
        content: text,
      },
    },
    resolved: true,
  };
}
