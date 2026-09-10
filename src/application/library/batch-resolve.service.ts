import { isExtractionAttempt, withNotice, EXTRACTION_REFUSAL } from "@/server/mcp/utils/guard";
import type { LibraryEntry } from "@/server/mcp/types";

export interface BatchResolveItem {
  query: string;
  found: boolean;
  id: string | null;
  name: string | null;
  docsUrl: string | null;
  source: "registry" | "blocked" | null;
  blocked?: boolean;
}

/**
 * Capability seams of the batch-resolve use case. Registry lookup and
 * source-policy checks are infrastructure injected here. Shared
 * protection/presentation (guard) stays imported as cross-cutting
 * technical infrastructure.
 */
export interface BatchResolveDeps {
  isSourceEnabled: (source: string) => boolean;
  lookupByAlias: (name: string) => LibraryEntry | null | undefined;
  fuzzySearch: (name: string, limit: number) => LibraryEntry[];
  isLibraryBlocked: (id: string, names: string[]) => boolean;
}

export interface BatchResolveInput {
  libraryNames: string[];
}

export interface BatchResolveApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent: {
      total: number;
      found: number;
      results: BatchResolveItem[];
    };
  };
  resolved: boolean;
}

/**
 * Batch library-resolution use case shared by the MCP tool and any
 * future consumer. Registry-only by contract: unlike gl_resolve_library
 * there is no external npm/PyPI/crates fallback here. Owns the
 * per-item guard (one flagged name must not discard its siblings),
 * alias then fuzzy resolution, blocked-list reporting, and render.
 * Transport adapters only validate input, inject the live
 * infrastructure adapters, and map this result.
 */
export async function batchResolveUseCase(
  input: BatchResolveInput,
  deps: BatchResolveDeps,
): Promise<BatchResolveApplicationResult> {
  const results = await Promise.all(
    input.libraryNames.map(async (name): Promise<BatchResolveItem> => {
      // Per-item guard: one flagged name must not discard the other
      // legitimate results in the batch.
      if (isExtractionAttempt(name)) {
        return {
          query: name,
          found: false,
          id: null,
          name: null,
          docsUrl: null,
          source: null,
          blocked: true,
        };
      }
      // Registry steps are skipped when library-registry is disabled
      // on the Sources page; blocked names report as blocked.
      const registryOn = deps.isSourceEnabled("library-registry");
      const alias = registryOn ? deps.lookupByAlias(name) : undefined;
      if (alias) {
        if (deps.isLibraryBlocked(alias.id, [alias.name, name])) {
          return {
            query: name,
            found: false,
            id: null,
            name: null,
            docsUrl: null,
            source: "blocked",
          };
        }
        return {
          query: name,
          found: true,
          id: alias.id,
          name: alias.name,
          docsUrl: alias.docsUrl,
          source: "registry",
        };
      }

      const fuzzy = registryOn ? deps.fuzzySearch(name, 1) : [];
      if (fuzzy.length > 0 && fuzzy[0]) {
        if (deps.isLibraryBlocked(fuzzy[0].id, [fuzzy[0].name, name])) {
          return {
            query: name,
            found: false,
            id: null,
            name: null,
            docsUrl: null,
            source: "blocked",
          };
        }
        return {
          query: name,
          found: true,
          id: fuzzy[0].id,
          name: fuzzy[0].name,
          docsUrl: fuzzy[0].docsUrl,
          source: "registry",
        };
      }

      return {
        query: name,
        found: false,
        id: null,
        name: null,
        docsUrl: null,
        source: null,
      };
    }),
  );

  const found = results.filter((r) => r.found).length;
  const notFound = results.filter((r) => !r.found).map((r) => r.query);

  const lines = results.map((r) => {
    if (r.found) return `- **${r.name}** (${r.id}) - ${r.docsUrl}`;
    if ("blocked" in r && r.blocked) return `- **${r.query}** - ${EXTRACTION_REFUSAL}`;
    if (r.source === "blocked") {
      return `- **${r.query}** - blocked by the Sources settings`;
    }
    return `- **${r.query}** - not found in registry`;
  });

  const header = [
    `# Batch Resolution - ${found}/${results.length} resolved`,
    notFound.length > 0 ? `> Not found: ${notFound.join(", ")}` : "",
    "",
    "---",
    "",
  ].filter(Boolean).join("\n");

  return {
    response: {
      content: [{ type: "text", text: withNotice(header + lines.join("\n")) }],
      structuredContent: {
        total: results.length,
        found,
        results,
      },
    },
    resolved: true,
  };
}
