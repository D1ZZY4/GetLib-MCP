import type { Metadata } from "next";
import { McpResourceList } from "@/web/features/mcp/components/mcp-resource-list";

export const metadata: Metadata = {
  title: "MCP resources - GetLib MCP",
  description: "Browse readable MCP resources.",
};

export default function Page() {
  return <McpResourceList />;
}
