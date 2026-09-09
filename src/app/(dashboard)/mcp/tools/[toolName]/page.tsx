import type { Metadata } from "next";
import { McpToolDetail } from "@/web/features/mcp/components/mcp-tool-detail";

export const metadata: Metadata = {
  title: "MCP tool - GetLib MCP",
  description: "Tool overview, input contract, and annotations.",
};

export default async function Page({ params }: { params: Promise<{ toolName: string }> }) {
  const { toolName } = await params;
  return <McpToolDetail toolName={toolName} />;
}
