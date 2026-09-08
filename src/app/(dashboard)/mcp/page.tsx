import type { Metadata } from "next";
import { McpOverview } from "@/web/features/mcp/components/mcp-overview";

export const metadata: Metadata = {
  title: "MCP - GetLib MCP",
  description: "Manage the GetLib MCP server: tools, resources, and prompts.",
};

export default function Page() {
  return <McpOverview />;
}
