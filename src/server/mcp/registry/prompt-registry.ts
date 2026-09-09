export interface GlPromptArg {
  name: string;
  description: string;
  required: boolean;
}

export type GlPromptRender = (args: Record<string, string>) => unknown | Promise<unknown>;

export interface GlPromptDef {
  name: string;
  description: string;
  args?: GlPromptArg[];
  render: GlPromptRender;
}

const prompts = new Map<string, GlPromptDef>();

export function definePrompt(def: GlPromptDef): GlPromptDef {
  if (def.name.length === 0) {
    throw new Error("Prompt name must not be empty");
  }
  if (prompts.has(def.name)) {
    throw new Error(`Duplicate prompt registration: "${def.name}"`);
  }
  prompts.set(def.name, def);
  return def;
}

export function listPrompts(): Array<Pick<GlPromptDef, "name" | "description" | "args">> {
  return [...prompts.values()].map(({ name, description, args }) => ({
    name,
    description,
    args,
  }));
}

export function getPrompt(name: string): GlPromptDef | undefined {
  return prompts.get(name);
}

function narrowArgs(raw: unknown): Record<string, string> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Prompt arguments must be an object.");
  }
  const narrowed: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "string") {
      throw new Error(`Prompt argument "${key}" must be a string.`);
    }
    narrowed[key] = value;
  }
  return narrowed;
}

export async function renderPrompt(name: string, rawArgs: unknown = {}): Promise<unknown> {
  const prompt = prompts.get(name);
  if (!prompt) {
    throw new Error(`Unknown prompt: ${name}`);
  }
  const args = narrowArgs(rawArgs);
  for (const arg of prompt.args ?? []) {
    const value = args[arg.name];
    if (arg.required && (value === undefined || value.trim() === "")) {
      throw new Error(`Missing required prompt argument: "${arg.name}".`);
    }
  }
  return prompt.render(args);
}
