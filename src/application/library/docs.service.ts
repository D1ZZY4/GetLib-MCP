import type { FetchResult, LibraryEntry } from "@/server/mcp/types";
import { extractRelevantContent } from "@/server/mcp/utils/extract";
import { checkEvidence } from "@/server/mcp/utils/evidence";
import { isExtractionAttempt, EXTRACTION_REFUSAL } from "@/server/mcp/utils/guard";
import { sanitizeContent } from "@/server/mcp/utils/sanitize";
import type { DocsTarget } from "@/server/mcp/services/docs/docs-resolve";
import type { DocsReportInput, DocsResponse } from "@/server/mcp/services/docs/docs-report";

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

/**
 * Capability seams of the docs use case. Target resolution, version
 * detection, content retrieval, topic application, deep-fetch
 * escalation, and render are infrastructure injected here. Pure content
 * transformation (sanitize, extract, evidence, index check) and shared
 * protection stay imported as cross-cutting technical infrastructure.
 */
export interface DocsDeps {
  resolveLibraryFromId: (libraryId: string) => LibraryEntry | null;
  detectVersionForEntry: (
    projectPath: string | undefined,
    version: string | undefined,
    entry: Pick<LibraryEntry, "id" | "npmPackage" | "pypiPackage"> | null | undefined,
  ) => Promise<string | undefined>;
  resolveDocsTarget: (libraryId: string, entry: LibraryEntry | null) => Promise<DocsTarget | string>;
  fetchDocsContent: (
    target: DocsTarget,
    entry: LibraryEntry | null,
    libraryId: string,
    topic: string,
    version: string | undefined,
  ) => Promise<FetchResult | string>;
  applyTopic: (
    fetchResult: FetchResult,
    topic: string,
    docsUrl: string,
    urlPatterns: string[] | undefined,
  ) => Promise<FetchResult>;
  deepFetchForTopic: (
    fetchResult: FetchResult,
    topic: string,
    docsUrl: string,
    urlPatterns: string[] | undefined,
    maxPages?: number,
    force?: boolean,
  ) => Promise<FetchResult>;
  renderDocs: (input: DocsReportInput) => DocsResponse;
  isIndexContent: (content: string) => boolean;
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
export async function fetchLibraryDocsUseCase(input: DocsInput, deps: DocsDeps): Promise<DocsApplicationResult> {
  let { libraryId, topic = "", version, tokens, projectPath } = input;
  const startedAt = Date.now();
  // Guard only the resolution identifier - topic merely filters content
  // within one already-resolved library and cannot enumerate the registry;
  // guarding it refused ordinary queries ("complete guide", "list rendering").
  if (isExtractionAttempt(libraryId)) {
    return { response: { content: [{ type: "text", text: EXTRACTION_REFUSAL }] }, resolved: true };
  }

  const entry = deps.resolveLibraryFromId(libraryId);

  // Auto-detect version from lockfile if projectPath given and version not explicit
  version = await deps.detectVersionForEntry(projectPath, version, entry);

  const target = await deps.resolveDocsTarget(libraryId, entry);
  if (typeof target === "string") {
    return { response: { content: [{ type: "text", text: target }] }, resolved: false };
  }

  const fetched = await deps.fetchDocsContent(target, entry, libraryId, topic, version);
  if (typeof fetched === "string") {
    return { response: { content: [{ type: "text", text: fetched }] }, resolved: false };
  }

  let fetchResult: FetchResult = fetched;
  if (topic) {
    fetchResult = await deps.applyTopic(fetchResult, topic, target.docsUrl, entry?.urlPatterns);
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
  if (topic && (!evidence.ok || deps.isIndexContent(text)) && Date.now() - startedAt < 45_000) {
    const wasIndex = deps.isIndexContent(text);
    const deeper = await deps.deepFetchForTopic(fetchResult, topic, target.docsUrl, entry?.urlPatterns, undefined, true);
    escalated = true;
    if (deeper.url !== fetchResult.url) {
      sourcesTried.push({ url: deeper.url, sourceType: deeper.sourceType });
    }
    const deeperSafe = sanitizeContent(deeper.content);
    const reExtract = extractRelevantContent(deeperSafe, topic, tokens);
    const reCheck = checkEvidence(reExtract.text, topic);
    const deeperIsIndex = deps.isIndexContent(reExtract.text);
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

  const { response, resolved } = deps.renderDocs({
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
