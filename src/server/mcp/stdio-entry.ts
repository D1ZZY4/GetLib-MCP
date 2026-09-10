import { LIBRARY_REGISTRY } from "./sources/registry";
import { renderRoutingTable } from "./services/intent-router";
import { SERVER_NAME, SERVER_VERSION } from "./constants";
import { initializeApplication } from "./init";
import { listPrompts } from "./registry/prompt-registry";
import { listResources } from "./registry/resource-registry";
import { listTools } from "./registry/tool-registry";
import { createServer } from "./server";
import { shutdownApplication } from "./shutdown";
import { connectStdio } from "./transport/stdio";
import { ensureRegistryLoaded } from "./registry/registry-loader";
import { log } from "./utils/logger";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--version") || args.includes("-v")) {
    console.log(`${SERVER_NAME} v${SERVER_VERSION}`);
    return;
  }
  if (args.includes("--health")) {
    ensureRegistryLoaded();
    console.log(
      JSON.stringify({
        status: "ok",
        name: SERVER_NAME,
        version: SERVER_VERSION,
        tools: listTools().length,
        resources: listResources().length,
        prompts: listPrompts().length,
        registryEntries: LIBRARY_REGISTRY.length,
        node: process.version,
      }),
    );
    return;
  }
  if (args.includes("--routing-table")) {
    console.log(renderRoutingTable());
    return;
  }
  await initializeApplication();
  const server = createServer();
  await connectStdio(server);
  const shutdown = (signal: string): void => {
    void shutdownApplication().finally(() => {
      process.exit(signal === "SIGTERM" ? 0 : 130);
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
  // Diagnostics go through the centralized redacting logger to stderr.
  // stdout stays reserved for the MCP protocol stream.
  log({
    level: "info",
    msg: `getlib-mcp server running on stdio with ${listTools().length} tools, ${listResources().length} resources, ${listPrompts().length} prompts`,
  });
}

main().catch((error: unknown) => {
  log({
    level: "error",
    msg: "Failed to start getlib-mcp server",
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
