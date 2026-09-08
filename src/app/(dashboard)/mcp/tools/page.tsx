import type { Metadata } from "next";
import { McpToolList } from "@/web/features/mcp/components/mcp-tool-list";

export const metadata: Metadata = {
  title: "MCP tools - GetLib MCP",
  description: "List and run every registered MCP tool.",
};

export default function Page() {
  return <McpToolList />;
}
