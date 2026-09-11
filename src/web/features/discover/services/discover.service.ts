import { postJson } from "@/web/lib/api-client";

export interface SearchSource {
  name: string;
  url: string;
  content: string;
}

export interface SearchEvidence {
  ok: boolean;
  matchRatio: number;
  occurrences: number;
  verdict: "strong" | "weak" | "miss";
}

export interface DiscoverResult {
  query: string;
  sources: SearchSource[];
  evidence: SearchEvidence;
}

export interface DocDetail {
  displayName: string;
  sourceUrl: string;
  topic: string;
  content: string;
  truncated: boolean;
  qualityScore: number;
  verdict: "strong" | "weak" | "miss" | "untargeted";
}

interface ManagementSearchEnvelope {
  query: string;
  resolved: boolean;
  durationMs: number;
  result: {
    content: Array<{ text: string }>;
    structuredContent?: Record<string, unknown>;
  };
}

interface ManagementDocsEnvelope {
  resolved: boolean;
  durationMs: number;
  result: {
    content: Array<{ text: string }>;
    structuredContent?: Record<string, unknown>;
  };
}

function isSearchSource(value: unknown): value is SearchSource {
  if (typeof value !== "object" || value === null) return false;
  const source = value as Record<string, unknown>;
  return (
    typeof source.name === "string" &&
    typeof source.url === "string" &&
    typeof source.content === "string"
  );
}

function parseEvidence(value: unknown): SearchEvidence {
  const fallback: SearchEvidence = { ok: false, matchRatio: 0, occurrences: 0, verdict: "miss" };
  if (typeof value !== "object" || value === null) return fallback;
  const evidence = value as Record<string, unknown>;
  const verdict = evidence.verdict;
  return {
    ok: evidence.ok === true,
    matchRatio: typeof evidence.matchRatio === "number" ? evidence.matchRatio : 0,
    occurrences: typeof evidence.occurrences === "number" ? evidence.occurrences : 0,
    verdict: verdict === "strong" || verdict === "weak" || verdict === "miss" ? verdict : "miss",
  };
}

/**
 * Live documentation search through the shared search pipeline: the same
 * application capability the gl_search MCP tool calls, served over the
 * management API. Browsers never touch the MCP protocol endpoints.
 */
export async function searchLibraries(query: string): Promise<DiscoverResult> {
  const envelope = await postJson<ManagementSearchEnvelope>("/api/management/discover", { query });
  const structured = envelope.result?.structuredContent;
  const sources = Array.isArray(structured?.sources)
    ? structured.sources.filter(isSearchSource)
    : [];
  return {
    query: typeof structured?.query === "string" ? structured.query : query,
    sources,
    evidence: parseEvidence(structured?.evidence),
  };
}

/**
 * Full documentation for one source, for the detail route. gl_get_docs
 * accepts a direct URL as the libraryId, so a clicked search result opens
 * without a second resolve round-trip.
 */
export async function fetchDocDetail(sourceUrl: string, topic: string): Promise<DocDetail> {
  const envelope = await postJson<ManagementDocsEnvelope>("/api/management/docs", {
    libraryId: sourceUrl,
    ...(topic.trim() === "" ? {} : { topic }),
  });
  const structured = envelope.result?.structuredContent ?? {};
  const evidence = parseEvidence(structured.evidence);
  const verdictRaw = structured.verdict ?? evidence.verdict;
  return {
    displayName:
      typeof structured.displayName === "string" && structured.displayName.length > 0
        ? structured.displayName
        : sourceUrl,
    sourceUrl:
      typeof structured.sourceUrl === "string" && structured.sourceUrl.length > 0
        ? structured.sourceUrl
        : sourceUrl,
    topic: typeof structured.topic === "string" ? structured.topic : topic,
    content: typeof structured.content === "string" ? structured.content : "",
    truncated: structured.truncated === true,
    qualityScore: typeof structured.qualityScore === "number" ? structured.qualityScore : 0,
    verdict:
      verdictRaw === "strong" || verdictRaw === "weak" || verdictRaw === "miss" || verdictRaw === "untargeted"
        ? verdictRaw
        : evidence.verdict,
  };
}
