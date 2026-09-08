import type { Metadata } from "next";
import { McpHealth } from "@/web/features/mcp/components/mcp-health";

export const metadata: Metadata = {
  title: "MCP health - GetLib MCP",
  description: "Operational health of this MCP server process.",
};

export default function Page() {
  return <McpHealth />;
}
