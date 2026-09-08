export type GlToolName =
  | "gl_resolve_library"
  | "gl_get_docs"
  | "gl_best_practices"
  | "gl_auto_scan"
  | "gl_search"
  | "gl_audit"
  | "gl_changelog"
  | "gl_compat"
  | "gl_compare"
  | "gl_examples"
  | "gl_migration"
  | "gl_batch_resolve"
  | "gl_snippets";

export interface IntentMatch {
  tool: GlToolName;
  args: Record<string, unknown>;
  reason: string;
  /** 0.0–1.0 confidence score */
  confidence: number;
}

export interface IntentInput {
  query: string;
  projectPath?: string;
}
