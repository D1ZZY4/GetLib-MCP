import { defineTool } from "../registry/tool-registry";
import { z } from "zod";
import { withTelemetry } from "../services/telemetry";
import { fuzzySearch, lookupByAlias } from "../sources/registry";
import { isLibraryBlocked, isSourceEnabled } from "../services/source-settings";
import { isExtractionAttempt, withNotice, EXTRACTION_REFUSAL, withToolTimeout } from "../utils/guard";

const InputSchema = z.object({
  libraryNames: z
    .array(z.string().min(1).max(200))
    .min(1)
    .max(20)
    .describe("Array of library names to resolve (max 20). Example: ['react', 'next', 'tailwind']"),
});

/** Returned when the whole pipeline exceeds the tool timeout - an actionable
 *  next step beats a hung call or an MCP-level timeout error. */
const TIMEOUT_RESPONSE = {
  content: [{ type: "text" as const, text: "Library resolution timed out. Retry with fewer names, or call gl_resolve_library one name at a time." }],
  structuredContent: {
    total: 0,
    found: 0,
    results: [] as never[],
  },
};

export function registerBatchResolveTools(): void {
  defineTool({
    name: "gl_batch_resolve",
      title: "Batch Resolve Libraries",
      description: `Resolve multiple library names to IDs and docs URLs in a single call. Returns results for each library. Max 20 per call.

Use this when you already have a list of library names and need to batch-resolve them to IDs efficiently (e.g. before calling gl_get_docs for each). Registry-only lookup - no external npm/PyPI/crates fallback. For a single library with external fallback, use gl_resolve_library instead. For scanning a project's actual dependency files and fetching best practices, use gl_auto_scan instead.`,
      inputSchema: InputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    run: async (rawArgs: unknown) => {
      const { libraryNames } = InputSchema.parse(rawArgs);
      return withTelemetry("gl_batch_resolve", async (ctx) => {
        ctx.resolved = true;
        return withToolTimeout(async () => {
          const results = await Promise.all(
            libraryNames.map(async (name) => {
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
              const registryOn = isSourceEnabled("library-registry");
              const alias = registryOn ? lookupByAlias(name) : undefined;
              if (alias) {
                if (isLibraryBlocked(alias.id, [alias.name, name])) {
                  return {
                    query: name,
                    found: false,
                    id: null,
                    name: null,
                    docsUrl: null,
                    source: "blocked" as const,
                  };
                }
                return {
                  query: name,
                  found: true,
                  id: alias.id,
                  name: alias.name,
                  docsUrl: alias.docsUrl,
                  source: "registry" as const,
                };
              }

              const fuzzy = registryOn ? fuzzySearch(name, 1) : [];
              if (fuzzy.length > 0 && fuzzy[0]) {
                if (isLibraryBlocked(fuzzy[0].id, [fuzzy[0].name, name])) {
                  return {
                    query: name,
                    found: false,
                    id: null,
                    name: null,
                    docsUrl: null,
                    source: "blocked" as const,
                  };
                }
                return {
                  query: name,
                  found: true,
                  id: fuzzy[0].id,
                  name: fuzzy[0].name,
                  docsUrl: fuzzy[0].docsUrl,
                  source: "registry" as const,
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
            content: [{ type: "text", text: withNotice(header + lines.join("\n")) }],
            structuredContent: {
              total: results.length,
              found,
              results,
            },
          };
        }, TIMEOUT_RESPONSE);
      });
    },
  });
}
