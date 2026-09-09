import type { Metadata } from "next";
import { McpClientDetail } from "@/web/features/mcp/components/mcp-client-detail";

export const metadata: Metadata = {
  title: "MCP client - GetLib MCP",
  description: "Connected client metadata and connection state.",
};

export default async function Page({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <McpClientDetail clientId={clientId} />;
}
