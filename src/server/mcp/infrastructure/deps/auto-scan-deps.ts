import type { AutoScanDeps } from "@/application/scan/auto-scan.service";
import { detectDependencies } from "@/server/mcp/utils/deps/manifest";
import { SKIP_DEPS } from "@/server/mcp/sources/skip-deps";
import { detectAllVersions } from "@/server/mcp/utils/lockfile";
import { matchDepToRegistry, fetchLibraryBatches } from "@/server/mcp/services/project/dependency-fetch";
import { renderScanReport } from "@/application/scan/auto-scan-report";

/**
 * Live infrastructure binding for the auto-scan use case. The tool
 * adapter injects this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveAutoScanDeps: AutoScanDeps = {
  detectDependencies,
  skipDeps: SKIP_DEPS,
  matchDepToRegistry,
  detectAllVersions,
  fetchLibraryBatches,
  renderScanReport,
};
