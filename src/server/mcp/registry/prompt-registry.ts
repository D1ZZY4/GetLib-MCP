export interface GlPromptRun {
  (): unknown | Promise<unknown>;
}

export interface GlPromptDef {
  name: string;
  description: string;
  render: GlPromptRun;
}

const prompts = new Map<string, GlPromptDef>();

export function definePrompt(def: GlPromptDef): GlPromptDef {
  prompts.set(def.name, def);
  return def;
}

export function listPrompts(): Array<Pick<GlPromptDef, "name" | "description">> {
  return [...prompts.values()].map(({ name, description }) => ({ name, description }));
}

export function renderPrompt(name: string): Promise<unknown> {
  const prompt = prompts.get(name);
  if (!prompt) {
    throw new Error(`Unknown prompt: ${name}`);
  }
  return Promise.resolve(prompt.render());
}
