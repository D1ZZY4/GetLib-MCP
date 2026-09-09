import type { Metadata } from "next";
import { McpPromptDetail } from "@/web/features/mcp/components/mcp-prompt-detail";

export const metadata: Metadata = {
  title: "MCP prompt - GetLib MCP",
  description: "Prompt argument contract and metadata.",
};

export default async function Page({ params }: { params: Promise<{ promptName: string }> }) {
  const { promptName } = await params;
  return <McpPromptDetail promptName={promptName} />;
}
