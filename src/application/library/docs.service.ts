import type { FetchResult } from "@/server/mcp/types";
import { isIndexContent } from "@/server/mcp/services/fetcher";
import { deepFetchForTopic } from "@/server/mcp/services/deep-fetch";
import { extractRelevantContent } from "@/server/mcp/utils/extract";
import { checkEvidence } from "@/server/mcp/utils/evidence";
import { isExtractionAttempt, EXTRACTION_REFUSAL } from "@/server/mcp/utils/guard";
import { sanitizeContent } from "@/server/mcp/utils/sanitize";
import { detectVersionForEntry } from "@/server/mcp/utils/lockfile";
import { resolveLibraryFromId, resolveDocsTarget } from "@/server/mcp/tools/docs-resolve";
import { fetchDocsContent, applyTopic } from "@/server/mcp/tools/docs-fetch";
import { renderDocs } from "@/server/mcp/tools/docs-report";

export const DOCS_LIBRARY_ID_MAX = 300;
export const DOCS_TOPIC_MAX = 500;
export const DOCS_VERSION_MAX = 50;
export const DOCS_PROJECT_PATH_MAX = 500;

export interface DocsInput {
  libraryId: string;
  topic?: string;
  version?: string;
  tokens: number;
  projectPath?: string;
}

export interface DocsApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  };
  resolved: boolean;
}

/**
 * Library documentation use case shared by the MCP docs tool and any
 * future consumer. Owns the full pipeline: extraction guard, resolve,
 * lockfile version detection, fetch, topic application, evidence-gated
 * escalation, render. Transport adapters (tools, API routes) only
 * validate input and map this result.
 */
export async function fetchLibraryDocsUseCase(input: DocsInput): Promise<DocsApplicationResult> {
  let { libraryId, topic = "", version, tokens, projectPath } = input;
  const startedAt = Date.now();
  // Guard only the resolution identifier - topic merely filters content
  // within one already-resolved library and cannot enumerate the registry;
  // guarding it refused ordinary queries ("complete guide", "list rendering").
  if (isExtractionAttempt(libraryId)) {
    return { response: { content: [{ type: "text", text: EXTRACTION_REFUSAL }] }, resolved: true };
  }

  const entry = resolveLibraryFromId(libraryId);

  // Auto-detect version from lockfile if projectPath given and version not explicit
  version = await detectVersionForEntry(projectPath, version, entry);

  const target = await resolveDocsTarget(libraryId, entry);
  if (typeof target === "string") {
    return { response: { content: [{ type: "text", text: target }] }, resolved: false };
  }

  const fetched = await fetchDocsContent(target, entry, libraryId, topic, version);
  if (typeof fetched === "string") {
    return { response: { content: [{ type: "text", text: fetched }] }, resolved: false };
  }

  let fetchResult: FetchResult = fetched;
  if (topic) {
    fetchResult = await applyTopic(fetchResult, topic, target.docsUrl, entry?.urlPatterns);
  }

  let safe = sanitizeContent(fetchResult.content);
  const extracted = extractRelevantContent(safe, topic, tokens);
  let text = extracted.text;
  let truncated = extracted.truncated;

  // Evidence gate - the "never generic" guarantee. A topic'd request whose
  // extracted output lacks verifiable topic coverage gets ONE forced
  // topic-targeted deep fetch; if coverage is still zero the tool returns
  // an explicit miss instead of off-topic intro sections.
  let evidence = checkEvidence(text, topic);
  let escalated = false;
  const sourcesTried: Array<{ url: string; sourceType?: string; fetchedAt?: string }> = [
    { url: fetchResult.url, sourceType: fetchResult.sourceType, ...(fetchResult.fetchedAt ? { fetchedAt: fetchResult.fetchedAt } : {}) },
  ];

  // Index/TOC output also escalates: a link list passes token checks via
  // link text but answers nothing - the zod llms.txt served verbatim was
  // exactly this failure. Elapsed guard bounds total latency: a slow
  // initial pipeline must not stack a second 25s deep-fetch on top.
  if (topic && (!evidence.ok || isIndexContent(text)) && Date.now() - startedAt < 45_000) {
    const wasIndex = isIndexContent(text);
    const deeper = await deepFetchForTopic(fetchResult, topic, target.docsUrl, entry?.urlPatterns, undefined, true);
    escalated = true;
    if (deeper.url !== fetchResult.url) {
      sourcesTried.push({ url: deeper.url, sourceType: deeper.sourceType });
    }
    const deeperSafe = sanitizeContent(deeper.content);
    const reExtract = extractRelevantContent(deeperSafe, topic, tokens);
    const reCheck = checkEvidence(reExtract.text, topic);
    const deeperIsIndex = isIndexContent(reExtract.text);
    const better = wasIndex
      ? !deeperIsIndex && reCheck.matchRatio > 0
      : reCheck.ok || reCheck.occurrences > evidence.occurrences;
    if (better) {
      fetchResult = deeper;
      safe = deeperSafe;
      text = reExtract.text;
      truncated = reExtract.truncated;
      evidence = reCheck;
    }
  }

  const { response, resolved } = renderDocs({
    libraryId,
    displayName: target.displayName,
    topic,
    version,
    text,
    safe,
    truncated,
    fetchResult,
    evidence,
    escalated,
    sourcesTried,
  });
  return { response, resolved };
}
