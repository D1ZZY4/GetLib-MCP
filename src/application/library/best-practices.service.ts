import { isExtractionAttempt, EXTRACTION_REFUSAL } from "@/server/mcp/utils/guard";
import type { ReportInput, ToolResponse } from "./best-practices-report";
import type { BestPracticesTarget } from "@/server/mcp/services/best-practices/target";
import type { BestPracticesContent } from "@/server/mcp/services/best-practices/fetch";
import type { EscalationInput, EscalationResult } from "@/server/mcp/services/best-practices/escalate";
import type { EvidenceCheck } from "@/server/mcp/utils/evidence";
import type { LibraryEntry } from "@/server/mcp/types";

const UNRESOLVED_HELP = [
  "**What to try next:**",
  "- Run gl_resolve_library to find the correct library ID",
  "- Try gl_search with a freeform query (e.g. 'React performance best practices')",
  "- Use the npm/PyPI package name or a direct docs URL",
].join("\n");

/**
 * Capability seams of the best-practices use case. Target resolution,
 * content fetching, weak-evidence escalation, registry identity checks,
 * and report rendering are infrastructure details injected here. Shared
 * protection (isExtractionAttempt) stays imported as cross-cutting
 * technical infrastructure.
 */
export interface BestPracticesDeps {
  resolveBestPracticesTarget: (libraryId: string) => Promise<BestPracticesTarget | string | null>;
  fetchBestPracticesContent: (
    libraryId: string,
    docsUrl: string,
    llmsTxtUrl: string | undefined,
    llmsFullTxtUrl: string | undefined,
    githubUrl: string | undefined,
    topic: string,
    tokens: number,
    bestPracticesPaths?: string[],
  ) => Promise<BestPracticesContent>;
  escalateWeakEvidence: (input: EscalationInput) => Promise<EscalationResult>;
  lookupById: (id: string) => LibraryEntry | null | undefined;
  lookupByAlias: (alias: string) => LibraryEntry | null | undefined;
  checkEvidence: (text: string, topic: string) => EvidenceCheck;
  renderBestPractices: (input: ReportInput) => ToolResponse;
}

export interface BestPracticesInput {
  libraryId: string;
  topic: string;
  version?: string;
  tokens: number;
}

export interface BestPracticesApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  };
  resolved: boolean;
}

type IdentityDeps = Pick<BestPracticesDeps, "lookupById" | "lookupByAlias" | "checkEvidence">;

function isRegistryIdentifier(libraryId: string, deps: IdentityDeps): boolean {
  return (deps.lookupById(libraryId) ?? deps.lookupByAlias(libraryId)) !== undefined;
}

/**
 * Explicitly-scoped targets the user deliberately addressed: registry
 * prefixes, direct docs URLs, and bare hostnames. These skip the
 * fuzzy-identity gate below because the user - not fuzzy search -
 * chose the target.
 */
function isExplicitTarget(libraryId: string): boolean {
  const normalized = libraryId.trim();
  if (
    normalized.startsWith("npm:") ||
    normalized.startsWith("pypi:") ||
    normalized.startsWith("crates:") ||
    normalized.startsWith("go:") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://")
  ) {
    return true;
  }
  // Bare hostnames only: must contain a letter (so pure version strings
  // like "1.2.3" stay behind the fuzzy-identity gate) alongside the dot.
  if (!normalized.includes(".") || normalized.includes(" ")) return false;
  if (/^v?\d+(\.\d+)*$/.test(normalized)) return false;
  return /[a-zA-Z]/.test(normalized);
}

/**
 * Fuzzy-identity gate for bare non-registry identifiers. resolveDynamic
 * falls back to npm/GitHub fuzzy search, which can latch onto an
 * unrelated repo for garbage input. Unless the fetched content actually
 * mentions what the user asked for (or the resolved library name), the
 * identifier is a miss - unrelated guides must never pass as best
 * practices. Pure and network-free so the rule itself is unit-testable.
 */
export function passesIdentityGate(
  text: string,
  libraryId: string,
  displayName: string,
  deps: IdentityDeps,
): boolean {
  if (isRegistryIdentifier(libraryId, deps) || isExplicitTarget(libraryId)) return true;
  return deps.checkEvidence(text, libraryId).ok || deps.checkEvidence(text, displayName).ok;
}

/**
 * Best-practices use case shared by the MCP tool and any future consumer.
 * Owns the full pipeline: extraction guard, target resolution, topic
 * scoping, content fetch, weak-evidence escalation, fuzzy-identity gate,
 * render. Transport adapters only validate input, inject the live
 * infrastructure adapters, and map this result.
 */
export async function bestPracticesUseCase(
  input: BestPracticesInput,
  deps: BestPracticesDeps,
): Promise<BestPracticesApplicationResult> {
  const miss = (text: string): BestPracticesApplicationResult => ({
    response: { content: [{ type: "text", text }] },
    resolved: false,
  });

  // Guard only the resolution identifier (see docs.ts) - topic is a
  // content filter, not a registry key.
  if (isExtractionAttempt(input.libraryId)) {
    return { response: { content: [{ type: "text", text: EXTRACTION_REFUSAL }] }, resolved: true };
  }

  const target = await deps.resolveBestPracticesTarget(input.libraryId);
  if (typeof target === "string") {
    // Blocked by Sources settings (or otherwise unusable): surface the
    // reason verbatim instead of a generic miss.
    return { response: { content: [{ type: "text", text: target }] }, resolved: false };
  }
  if (!target) {
    return miss(`Could not resolve "${input.libraryId}".\n\n${UNRESOLVED_HELP}`);
  }
  const { docsUrl, displayName, resolvedId, bestPracticesPaths } = target;

  const effectiveTopic = input.version
    ? `${input.topic ? `${input.topic} ` : ""}v${input.version.replace(/^v/, "")}`.trim()
    : input.topic;

  const fetched = await deps.fetchBestPracticesContent(
    resolvedId,
    docsUrl,
    target.llmsTxtUrl,
    target.llmsFullTxtUrl,
    target.githubUrl,
    effectiveTopic,
    input.tokens,
    bestPracticesPaths,
  );

  const sourcesTried: Array<{ url: string; sourceType?: string }> = [
    { url: fetched.sourceUrl },
    ...fetched.extraSources.map((url) => ({ url })),
  ];

  const escalation = await deps.escalateWeakEvidence({
    text: fetched.text,
    sourceUrl: fetched.sourceUrl,
    truncated: fetched.truncated,
    sourceType: fetched.sourceType,
    topic: effectiveTopic,
    docsUrl,
    tokens: input.tokens,
    bestPracticesPaths,
  });
  if (escalation.extraSource) sourcesTried.push(escalation.extraSource);

  // Identity gate for fuzzy-resolved identifiers: a bare name that
  // missed the registry only survives on npm/pypi/URL prefixes or an
  // explicit docs URL via resolveDynamic's fuzzy search, which can
  // latch onto an unrelated repo for garbage input. Unless the
  // fetched content actually mentions what the user asked for (or
  // the resolved library name), that is a miss - never serve
  // unrelated guides as best practices.
  if (!passesIdentityGate(escalation.text, input.libraryId, target.displayName, deps)) {
    return miss(`Could not resolve "${input.libraryId}".\n\n${UNRESOLVED_HELP}`);
  }

  return {
    response: deps.renderBestPractices({
      displayName,
      resolvedId,
      topic: effectiveTopic,
      sourcesTried,
      ...escalation,
    }),
    resolved: effectiveTopic && escalation.evidence.matchRatio === 0
      ? false
      : escalation.text.length > 200,
  };
}
