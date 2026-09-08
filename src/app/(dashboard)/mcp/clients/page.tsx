import type { Metadata } from "next";
import { McpClients } from "@/web/features/mcp/components/mcp-clients";

export const metadata: Metadata = {
  title: "MCP clients - GetLib MCP",
  description: "AI clients connected to this MCP server.",
};

export default function Page() {
  return <McpClients />;
}
