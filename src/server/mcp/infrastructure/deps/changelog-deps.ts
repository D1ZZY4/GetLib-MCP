import type { ChangelogDeps } from "@/application/library/changelog.service";
import { resolveChangelogTarget, fetchChangelog } from "@/server/mcp/services/changelog-sources";
import { docCacheBinding } from "@/server/mcp/services/cache";

/**
 * Live infrastructure binding for the changelog use case. The tool
 * adapter injects this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveChangelogDeps: ChangelogDeps = {
  resolveChangelogTarget,
  fetchChangelog,
  ...docCacheBinding(),
};
