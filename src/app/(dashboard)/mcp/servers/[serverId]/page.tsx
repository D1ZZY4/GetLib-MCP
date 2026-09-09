import type { Metadata } from "next";
import { McpServerDetail } from "@/web/features/mcp/components/mcp-server-detail";

export const metadata: Metadata = {
  title: "MCP server - GetLib MCP",
  description: "Server-specific operational view.",
};

export default async function Page({ params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  return <McpServerDetail serverId={serverId} />;
}
