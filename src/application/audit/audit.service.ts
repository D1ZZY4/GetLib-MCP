import { safeguardPath, withToolTimeout } from "@/server/mcp/utils/guard";
import { log } from "@/server/mcp/utils/logger";
import type { AuditReport, AuditReportInput } from "./audit-report";
import type { Issue } from "@/server/mcp/sources/audit-patterns";
import type { SourceFile } from "@/server/mcp/services/project/scan";
import type { DependencySource } from "@/server/mcp/utils/deps/manifest";

/**
 * Capability seams of the audit use case. Filesystem reading, pattern
 * execution, dependency detection, best-practice retrieval, and report
 * rendering are infrastructure details injected here; the orchestration
 * below owns the order and the fallback policy. Shared protection
 * (safeguardPath, withToolTimeout) stays imported as cross-cutting
 * technical infrastructure, not business capability.
 */
export interface AuditDeps {
  readProjectFiles: (projectPath: string, maxFiles: number) => Promise<SourceFile[]>;
  runPatterns: (files: SourceFile[], categories: string[]) => Issue[];
  groupIssues: (issues: Issue[]) => Map<string, Issue[]>;
  detectDependencies: (projectPath: string) => Promise<DependencySource[]>;
  fetchBestPractice: (query: string, tokens: number) => Promise<string>;
  renderAuditReport: (params: AuditReportInput) => AuditReport;
}

export interface AuditInput {
  projectPath?: string;
  categories: string[];
  tokens: number;
  maxFiles: number;
}

export interface AuditApplicationResult {
  response: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  };
  resolved: boolean;
}

/**
 * Project code-audit use case shared by the MCP audit tool and any future
 * consumer. Owns the full pipeline: path guard, file reading, pattern
 * execution, severity ranking, bounded best-practice enrichment, render.
 * Transport adapters (tools, API routes) only validate input, inject the
 * live infrastructure adapters, and map this result.
 */
export async function auditProjectUseCase(input: AuditInput, deps: AuditDeps): Promise<AuditApplicationResult> {
  const categories = input.categories.includes("all")
    ? ["all"]
    : [...new Set(input.categories)];
  const projectPath = input.projectPath === undefined || input.projectPath.trim().length === 0
    ? undefined
    : input.projectPath;
  let resolvedPath: string;
  try {
    resolvedPath = safeguardPath(projectPath ?? process.cwd());
  } catch (error) {
    log({ level: "debug", msg: "audit.project-path.invalid", error: error instanceof Error ? error.message : String(error) });
    return { response: { content: [{ type: "text", text: `Invalid project path.` }] }, resolved: false };
  }

  let files: SourceFile[];
  try {
    files = await deps.readProjectFiles(resolvedPath, input.maxFiles);
  } catch (error) {
    log({ level: "debug", msg: "audit.read-project.failed", error: error instanceof Error ? error.message : String(error) });
    return {
      response: { content: [{ type: "text", text: `Could not read project at: ${resolvedPath}` }] },
      resolved: false,
    };
  }

  if (files.length === 0) {
    // Reconcile with gl_auto_scan: manifests are not source files, so
    // a directory with only package.json/lockfiles yields zero files
    // here while auto_scan still detects dependencies. Say so plainly
    // instead of disagreeing with the sibling tool.
    const depSources = await deps.detectDependencies(resolvedPath);
    const depCount = depSources.reduce((total, source) => total + source.dependencies.length, 0);
    const hint =
      depCount > 0
        ? ` Found ${depCount} declared dependencies but no scannable source files - this looks like a build output or install directory. Run gl_auto_scan for dependency guidance, or point projectPath at the source checkout to audit your own code.`
        : "";
    return {
      response: { content: [{ type: "text", text: `No source files found in: ${resolvedPath}${hint}` }] },
      resolved: false,
    };
  }

  const allIssues = deps.runPatterns(files, categories);

  const grouped = deps.groupIssues(allIssues);
  const topIssues = Array.from(grouped.entries()).slice(0, 6);
  const bpMap = new Map<string, string>();

  await withToolTimeout(
    () =>
      Promise.allSettled(
        topIssues.map(async ([title, issues]) => {
          const query = issues[0]?.docsQuery ?? title;
          const bp = await deps.fetchBestPractice(query, Math.floor(input.tokens / topIssues.length));
          bpMap.set(title, bp);
        }),
      ),
    [],
  );

  const report = deps.renderAuditReport({
    projectPath: resolvedPath,
    filesScanned: files.length,
    issues: allIssues,
    grouped,
    bpMap,
    categories,
  });

  return {
    response: {
      content: [{ type: "text", text: report.text }],
      structuredContent: report.structuredContent,
    },
    resolved: allIssues.length > 0 || files.length > 0,
  };
}
