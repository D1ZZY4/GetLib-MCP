import type { BestPracticesDeps } from "@/application/library/best-practices.service";
import { resolveBestPracticesTarget } from "@/server/mcp/services/best-practices/target";
import { fetchBestPracticesContent } from "@/server/mcp/services/best-practices/fetch";
import { escalateWeakEvidence } from "@/server/mcp/services/best-practices/escalate";
import { lookupByAlias, lookupById } from "@/server/mcp/sources/registry";
import { checkEvidence } from "@/server/mcp/utils/evidence";
import { renderBestPractices } from "@/application/library/best-practices-report";

/**
 * Live infrastructure binding for the best-practices use case. The tool
 * adapter injects this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveBestPracticesDeps: BestPracticesDeps = {
  resolveBestPracticesTarget,
  fetchBestPracticesContent,
  escalateWeakEvidence,
  lookupById,
  lookupByAlias,
  checkEvidence,
  renderBestPractices,
};
