import type { Metadata } from "next";
import { McpLogDetail } from "@/web/features/mcp/components/mcp-log-detail";

export const metadata: Metadata = {
  title: "MCP log entry - GetLib MCP",
  description: "Request execution record.",
};

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  return <McpLogDetail requestId={requestId} />;
}
