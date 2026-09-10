import type { MigrationDeps } from "@/application/library/migration.service";
import { lookupByAlias, lookupById } from "@/server/mcp/sources/registry";
import { resolveDynamic } from "@/server/mcp/services/resolve";
import { checkLibraryAccess } from "@/server/mcp/services/source-settings";
import {
  fetchConventionalUpgradeDocs,
  fetchGitHubMigrationDocs,
  fetchVersionGuide,
  searchForUpgradeGuide,
} from "@/server/mcp/services/migration-sources";

/**
 * Live infrastructure binding for the migration use case. The tool
 * adapter injects this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveMigrationDeps: MigrationDeps = {
  lookupById,
  lookupByAlias,
  resolveDynamic,
  checkLibraryAccess,
  fetchVersionGuide,
  fetchGitHubMigrationDocs,
  fetchConventionalUpgradeDocs,
  searchForUpgradeGuide,
};
