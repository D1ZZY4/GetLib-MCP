import { runTool } from "./mcp.service";

export interface PlaygroundResult {
  output: string;
  durationMs: number;
  requestId: string;
  ok: boolean;
}

export const EXAMPLE_ARGS: Record<string, string> = {
  gl_dispatch: '{\n  "query": "use getlib for react"\n}',
  gl_resolve_library: '{\n  "libraryName": "react"\n}',
  gl_get_docs: '{\n  "libraryId": "facebook/react",\n  "topic": "hooks"\n}',
  gl_best_practices: '{\n  "libraryId": "vercel/next.js"\n}',
  gl_auto_scan: '{\n  "projectPath": ".",\n  "topic": "latest best practices"\n}',
  gl_search: '{\n  "query": "React Server Components patterns"\n}',
  gl_audit: '{\n  "projectPath": ".",\n  "categories": ["all"]\n}',
  gl_changelog: '{\n  "libraryId": "vercel/next.js"\n}',
  gl_compat: '{\n  "feature": "CSS container queries"\n}',
  gl_compare: '{\n  "libraries": ["react", "vue"],\n  "criteria": "performance"\n}',
  gl_examples: '{\n  "library": "react",\n  "pattern": "hooks"\n}',
  gl_migration: '{\n  "libraryId": "vercel/next.js",\n  "fromVersion": "14",\n  "toVersion": "15"\n}',
  gl_batch_resolve: '{\n  "libraryNames": ["react", "tailwind"]\n}',
  gl_snippets: '{\n  "libraryId": "facebook/react",\n  "topic": "hooks"\n}',
};

export function exampleArgsFor(tool: string): string {
  return EXAMPLE_ARGS[tool] ?? "{}";
}

export async function runToolWithArgs(name: string, argsText: string): Promise<PlaygroundResult> {
  let args: Record<string, unknown>;
  try {
    const parsed: unknown = argsText.trim() === "" ? {} : JSON.parse(argsText);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Arguments must be a JSON object.");
    }
    args = parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === "Arguments must be a JSON object.") throw error;
    throw new Error("Arguments must be valid JSON.");
  }
  const run = await runTool(name, args);
  return {
    output: JSON.stringify(run.result, null, 2),
    durationMs: run.durationMs,
    requestId: run.requestId,
    ok: true,
  };
}
