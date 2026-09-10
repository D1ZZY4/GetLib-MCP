import { safeguardPath, withNotice, withToolTimeout } from "@/server/mcp/utils/guard";
import type { ScanReport } from "./auto-scan-report";
import type { LibraryEntry } from "@/server/mcp/types";
import type { DependencySource } from "@/server/mcp/utils/deps/manifest";
import type { LibraryResult } from "@/server/mcp/services/project/dependency-fetch";

/**
 * Capability seams of the auto-scan use case. Dependency detection,
 * registry matching, version detection, batched fetching, and report
 * rendering are infrastructure details injected here. The skip list is
 * data, not logic, and arrives as a value for the same reason. Shared
 * protection and presentation (safeguardPath, withToolTimeout,
 * withNotice) stay imported as cross-cutting technical infrastructure.
 */
export interface AutoScanDeps {
  detectDependencies: (projectPath: string) => Promise<DependencySource[]>;
  skipDeps: ReadonlySet<string>;
  matchDepToRegistry: (depName: string) => LibraryEntry | null;
  detectAllVersions: (projectPath: string, packageNames: string[]) => Promise<Map<string, string>>;
  fetchLibraryBatches: (
    matched: Array<{ dep: string; entry: LibraryEntry }>,
    versions: Map<string, string>,
    topic: string,
    tokensPerLib: number,
    results: LibraryResult[],
  ) => Promise<void>;
  renderScanReport: (input: {
    projectPath: string;
    topic: string;
    sources: DependencySource[];
    totalDeps: number;
    matchedCount: number;
    topMatched: Array<{ dep: string; entry: LibraryEntry }>;
    unmatched: string[];
    versions: Map<string, string>;
    results: LibraryResult[];
  }) => ScanReport;
}

export interface AutoScanInput {
  projectPath?: string;
  topic: string;
  tokensPerLib: number;
}

export interface AutoScanApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  };
  resolved: boolean;
}

/**
 * Dependency auto-scan use case shared by the MCP auto-scan tool and any
 * future consumer. Owns the full pipeline: path guard, manifest
 * detection, dedupe and skip filtering, registry matching, lockfile
 * versions, bounded batched fetching, render. Transport adapters only
 * validate input, inject the live infrastructure adapters, and map this
 * result.
 */
export async function autoScanUseCase(input: AutoScanInput, deps: AutoScanDeps): Promise<AutoScanApplicationResult> {
  const text = (t: string): { content: Array<{ type: "text"; text: string }> } => ({
    content: [{ type: "text", text: t }],
  });

  let resolvedPath: string;
  try {
    resolvedPath = safeguardPath(
      input.projectPath === undefined || input.projectPath.trim().length === 0
        ? process.cwd()
        : input.projectPath,
    );
  } catch {
    return { response: text(`Invalid project path.`), resolved: false };
  }

  // No extraction guard on `topic` - it only scopes what to look up per
  // already-detected dependency and cannot enumerate the registry.
  const sources = await deps.detectDependencies(resolvedPath);

  if (sources.length === 0) {
    return {
      response: text(
        `No dependency files found in: ${resolvedPath}\n\nLooked for: package.json, requirements.txt, pyproject.toml, Cargo.toml, go.mod\n\nTry providing the correct projectPath or use gl_get_docs / gl_best_practices directly.`,
      ),
      resolved: false,
    };
  }

  // Deduplicate and filter
  const allDeps = new Set<string>();
  for (const src of sources) {
    for (const dep of src.dependencies) {
      if (!deps.skipDeps.has(dep.toLowerCase())) allDeps.add(dep);
    }
  }

  // Match to registry, deduplicating entries reached via different package names
  const matched: Array<{ dep: string; entry: LibraryEntry }> = [];
  const unmatched: string[] = [];
  for (const dep of allDeps) {
    const entry = deps.matchDepToRegistry(dep);
    if (!entry) {
      unmatched.push(dep);
    } else if (!matched.some((m) => m.entry.id === entry.id)) {
      matched.push({ dep, entry });
    }
  }

  // Cap at 20 libraries to avoid overwhelming responses
  const topMatched = matched.slice(0, 20);
  const versions = await deps.detectAllVersions(resolvedPath, [...allDeps]);
  const results: LibraryResult[] = [];
  await withToolTimeout(
    () => deps.fetchLibraryBatches(topMatched, versions, input.topic, input.tokensPerLib, results),
    undefined,
  );

  const report = deps.renderScanReport({
    projectPath: resolvedPath,
    topic: input.topic,
    sources,
    totalDeps: allDeps.size,
    matchedCount: matched.length,
    topMatched,
    unmatched,
    versions,
    results,
  });

  return {
    response: {
      content: [{ type: "text", text: withNotice(report.text) }],
      structuredContent: report.structuredContent,
    },
    resolved: results.some((r) => !r.failed),
  };
}
