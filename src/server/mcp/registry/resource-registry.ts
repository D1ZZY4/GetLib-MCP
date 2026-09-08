export interface GlResourceRun {
  (): unknown | Promise<unknown>;
}

export interface GlResourceDef {
  name: string;
  uri: string;
  description: string;
  read: GlResourceRun;
}

const resources = new Map<string, GlResourceDef>();

export function defineResource(def: GlResourceDef): GlResourceDef {
  resources.set(def.name, def);
  return def;
}

export function listResources(): Array<Pick<GlResourceDef, "name" | "uri" | "description">> {
  return [...resources.values()].map(({ name, uri, description }) => ({ name, uri, description }));
}

export function readResource(name: string): Promise<unknown> {
  const resource = resources.get(name);
  if (!resource) {
    throw new Error(`Unknown resource: ${name}`);
  }
  return Promise.resolve(resource.read());
}
