import type { Metadata } from "next";
import { McpLogViewer } from "@/web/features/mcp/components/mcp-log-viewer";

export const metadata: Metadata = {
  title: "MCP logs - GetLib MCP",
  description: "Recent MCP tool runs recorded by the registry middleware.",
};

export default function Page() {
  return <McpLogViewer />;
}
