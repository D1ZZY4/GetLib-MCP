import type { Metadata } from "next";
import { McpResourceDetail } from "@/web/features/mcp/components/mcp-resource-detail";

export const metadata: Metadata = {
  title: "MCP resource - GetLib MCP",
  description: "Resource identifier and metadata.",
};

export default async function Page({ params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  return <McpResourceDetail resourceId={resourceId} />;
}
