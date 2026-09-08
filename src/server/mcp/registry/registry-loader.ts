import { registerReviewPrompts } from "@/server/mcp/prompts/review.prompt";
import { registerLibraryResources } from "@/server/mcp/resources/libraries.resource";
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

// Side-effect module: registers every tool, resource, and prompt once so
// API routes and the stdio server share one single source of truth.
// Imported for its side effects only.
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
