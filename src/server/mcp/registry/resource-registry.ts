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
const resourceUris = new Set<string>();

export function defineResource(def: GlResourceDef): GlResourceDef {
  if (def.name.length === 0) {
    throw new Error("Resource name must not be empty");
  }
  if (def.description.trim().length === 0) {
    throw new Error(`Resource description must not be empty: "${def.name}"`);
  }
  if (!def.uri.startsWith("getlib://")) {
    throw new Error(`Resource URI must start with "getlib://": "${def.name}"`);
  }
  if (resources.has(def.name)) {
    throw new Error(`Duplicate resource registration: "${def.name}"`);
  }
  if (resourceUris.has(def.uri)) {
    throw new Error(`Duplicate resource URI registration: "${def.uri}"`);
  }
  resources.set(def.name, def);
  resourceUris.add(def.uri);
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
