import { appendLog } from "../middleware/logging";
import { generateRequestId } from "../utils/guard";

export interface GlToolRun {
  (args?: unknown): unknown | Promise<unknown>;
}

export interface GlToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface GlToolDef {
  name: string;
  title?: string;
  description: string;
  annotations?: GlToolAnnotations;
  _meta?: Record<string, unknown>;
  inputSchema?: Record<string, object>;
  run: GlToolRun;
}

const tools = new Map<string, GlToolDef>();

export function defineTool(def: GlToolDef): GlToolDef {
  if (def.name.length === 0) {
    throw new Error("Tool name must not be empty");
  }
  if (tools.has(def.name)) {
    throw new Error(`Duplicate tool registration: "${def.name}"`);
  }
  tools.set(def.name, def);
  return def;
}

export function listTools(): Array<Pick<GlToolDef, "name" | "description">> {
  return [...tools.values()].map(({ name, description }) => ({ name, description }));
}

export function getTool(name: string): GlToolDef | undefined {
  return tools.get(name);
}

export async function runTool(name: string, args?: unknown): Promise<unknown> {
  const started = Date.now();
  const requestId = generateRequestId();
  try {
    const tool = tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const result = await tool.run(args);
    appendLog({ kind: "tool", name, durationMs: Date.now() - started, ok: true, requestId });
    return result;
  } catch (error) {
    appendLog({ kind: "tool", name, durationMs: Date.now() - started, ok: false, requestId });
    throw error;
  }
}
