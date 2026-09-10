import type { AuditDeps } from "@/application/audit/audit.service";
import { readProjectFiles, runPatterns, groupIssues } from "@/server/mcp/services/project/scan";
import { detectDependencies } from "@/server/mcp/utils/deps/manifest";
import { fetchBestPractice } from "@/server/mcp/services/project/fixes";
import { renderAuditReport } from "@/application/audit/audit-report";

/**
 * Live infrastructure binding for the audit use case. The tool adapter
 * injects this; tests inject stubs. No business logic lives here, only
 * wiring between the application seam and the concrete providers.
 */
export const liveAuditDeps: AuditDeps = {
  readProjectFiles,
  runPatterns,
  groupIssues,
  detectDependencies,
  fetchBestPractice,
  renderAuditReport,
};
