import { LIBRARY_REGISTRY } from "../sources/registry";
import { listPrompts } from "../registry/prompt-registry";
import { defineResource, listResources } from "../registry/resource-registry";
import { listTools } from "../registry/tool-registry";

export function registerLibraryResources() {
  defineResource({
    name: "libraries",
    uri: "getlib://libraries",
    description: "Supported libraries with IDs and docs URLs from the offline registry.",
    read: () => ({
      total: LIBRARY_REGISTRY.length,
      libraries: LIBRARY_REGISTRY.map((entry) => ({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        docsUrl: entry.docsUrl,
      })),
    }),
  });

  defineResource({
    name: "stats",
    uri: "getlib://stats",
    description: "Live MCP primitive counts for this server instance.",
    read: () => ({
      tools: listTools().length,
      resources: listResources().length,
      prompts: listPrompts().length,
      registryEntries: LIBRARY_REGISTRY.length,
    }),
  });
}
