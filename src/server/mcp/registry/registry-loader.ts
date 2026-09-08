import { registerAuditPrompts } from "@/server/mcp/prompts/audit.prompt";
import { registerBestPracticesPrompts } from "@/server/mcp/prompts/best-practices.prompt";
import { registerComparePrompts } from "@/server/mcp/prompts/compare.prompt";
import { registerDocsPrompts } from "@/server/mcp/prompts/docs.prompt";
import { registerMigrationPrompts } from "@/server/mcp/prompts/migration.prompt";
import { registerReviewPrompts } from "@/server/mcp/prompts/review.prompt";
import { registerLibraryResources } from "@/server/mcp/resources/libraries.resource";
import { installSsrfGuard } from "@/server/mcp/services/http/ssrf";
import { registerAuditTools } from "@/server/mcp/tools/audit";
import { registerAutoScanTools } from "@/server/mcp/tools/auto-scan";
import { registerBatchResolveTools } from "@/server/mcp/tools/batch-resolve";
import { registerBestPracticesTools } from "@/server/mcp/tools/best-practices";
import { registerChangelogTools } from "@/server/mcp/tools/changelog";
import { registerCompatTools } from "@/server/mcp/tools/compat";
import { registerCompareTools } from "@/server/mcp/tools/compare";
import { registerDispatchTools } from "@/server/mcp/tools/dispatch";
import { registerDocsTools } from "@/server/mcp/tools/docs";
import { registerExamplesTools } from "@/server/mcp/tools/examples";
import { registerMigrationTools } from "@/server/mcp/tools/migration";
import { registerResolveTools } from "@/server/mcp/tools/resolve";
import { registerSearchTools } from "@/server/mcp/tools/search";
import { registerSnippetsTools } from "@/server/mcp/tools/snippets";

// Deterministic registry lifecycle: registers every tool, resource, and
// prompt exactly once so API routes and the stdio server share one single
// source of truth. Call ensureRegistryLoaded() instead of importing this
// module for its side effects; repeated calls are safe no-ops.
let loaded = false;

export function ensureRegistryLoaded(): void {
  if (loaded) return;
  // Infrastructure first: the SSRF-guarding dispatcher must be in place
  // before any capability performs a network fetch.
  installSsrfGuard();
  registerDispatchTools();
  registerResolveTools();
  registerDocsTools();
  registerBestPracticesTools();
  registerAutoScanTools();
  registerSearchTools();
  registerAuditTools();
  registerChangelogTools();
  registerCompatTools();
  registerCompareTools();
  registerExamplesTools();
  registerMigrationTools();
  registerBatchResolveTools();
  registerSnippetsTools();
  registerLibraryResources();
  registerReviewPrompts();
  registerDocsPrompts();
  registerBestPracticesPrompts();
  registerMigrationPrompts();
  registerAuditPrompts();
  registerComparePrompts();
  loaded = true;
}

export function isRegistryLoaded(): boolean {
  return loaded;
}

// Kept for backward compatibility: importing this module still loads the
// registry once, but new code should call ensureRegistryLoaded() explicitly
// so initialization order stays deterministic.
ensureRegistryLoaded();
