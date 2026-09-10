/**
 * Domain: evidence verdict contracts.
 *
 * Canonical ownership for topic-evidence verdicts used by every report
 * surface (best practices, docs, snippets, audit). Pure types and data
 * only - no I/O, no framework imports, no process.env. Application and
 * infrastructure layers both depend on these contracts instead of on
 * each other, keeping the dependency direction Domain <- Application.
 */

export type EvidenceVerdict = "untargeted" | "strong" | "weak" | "miss";

export interface EvidenceSummaryInput {
  ok: boolean;
  matchRatio: number;
  occurrences: number;
  matchedTokens: string[];
  missingTokens: string[];
}

export interface EvidenceSummary extends EvidenceSummaryInput {
  escalated: boolean;
  verdict: EvidenceVerdict;
}

/**
 * Single verdict rule shared by all report builders. Empty topic means
 * untargeted by contract. Otherwise ok maps to strong, any partial match
 * maps to weak, zero match maps to miss.
 */
export function verdictForTopic(
  evidence: EvidenceSummaryInput,
  topic: string,
): EvidenceVerdict {
  if (!topic) return "untargeted";
  if (evidence.ok) return "strong";
  if (evidence.matchRatio > 0) return "weak";
  return "miss";
}

/**
 * Single summary shape shared by all report builders. One implementation
 * so parallel report paths cannot drift into different verdict behavior.
 */
export function summarizeEvidence(
  evidence: EvidenceSummaryInput,
  topic: string,
  escalated: boolean,
): EvidenceSummary {
  return {
    ok: evidence.ok,
    matchRatio: evidence.matchRatio,
    occurrences: evidence.occurrences,
    matchedTokens: evidence.matchedTokens,
    missingTokens: evidence.missingTokens,
    escalated,
    verdict: verdictForTopic(evidence, topic),
  };
}

/**
 * Shared miss hint used when no topic-specific evidence was found.
 * Centralized so every surface reports the same copy.
 */
export const NO_EVIDENCE_HINT = "No topic-specific evidence found in any fetched source";
