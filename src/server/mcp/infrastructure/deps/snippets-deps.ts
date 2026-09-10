import type { SnippetsDeps } from "@/application/library/snippets.service";
import { resolveLibraryEntry, resolveSnippetTarget } from "@/server/mcp/services/snippets/resolve";
import { detectVersionForEntry } from "@/server/mcp/utils/lockfile";
import { snippetStore } from "@/server/mcp/services/snippet-store";
import { rankSnippets } from "@/server/mcp/utils/snippet-extract";
import { buildIndex } from "@/server/mcp/services/snippets/build-index";

/**
 * Live infrastructure binding for the snippets use case. The tool
 * adapter injects this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveSnippetsDeps: SnippetsDeps = {
  resolveLibraryEntry,
  detectVersionForEntry,
  resolveSnippetTarget,
  storeLoad: (library, version) => snippetStore.load(library, version),
  storeSave: (index) => snippetStore.save(index),
  rankSnippets,
  buildIndex,
};
