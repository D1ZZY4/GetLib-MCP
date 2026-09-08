export type { EvidenceCheck } from "./evidence/match";
export {
  normalizeForMatching,
  countTokenHits,
  stripUrlNoise,
  checkEvidence,
} from "./evidence/match";
export type { EvidenceSource } from "./evidence/render";
export { buildEvidenceBlock, extractHeadingOutline, buildHonestMiss } from "./evidence/render";
