import { LIBRARY_REGISTRY } from "./sources/registry";
import { renderRoutingTable } from "./services/intent-router";
import { SERVER_NAME, SERVER_VERSION, TOOL_COUNT } from "./constants";
import { initializeApplication } from "./init";
import { listPrompts } from "./registry/prompt-registry";
import { listResources } from "./registry/resource-registry";
import { listTools } from "./registry/tool-registry";
import { createServer } from "./server";
import { connectStdio } from "./transport/stdio";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--version") || args.includes("-v")) {
    console.log(`${SERVER_NAME} v${SERVER_VERSION}`);
    return;
  }
  if (args.includes("--health")) {
    console.log(
      JSON.stringify({
        status: "ok",
        name: SERVER_NAME,
        version: SERVER_VERSION,
        tools: TOOL_COUNT,
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
  console.error(
    `getlib-mcp server running on stdio with ${listTools().length} tools, ` +
      `${listResources().length} resources, ${listPrompts().length} prompts`,
  );
}

main().catch((error: unknown) => {
  console.error("Failed to start getlib-mcp server:", error);
  process.exit(1);
});
