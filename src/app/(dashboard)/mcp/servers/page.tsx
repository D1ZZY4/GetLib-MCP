import type { Metadata } from "next";
import { McpServerList } from "@/web/features/mcp/components/mcp-server-list";

export const metadata: Metadata = {
  title: "MCP servers - GetLib MCP",
  description: "Registered MCP servers with live primitive counts.",
};

export default function Page() {
  return <McpServerList />;
}
