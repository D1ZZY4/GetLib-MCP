import type { Metadata } from "next";
import { McpPromptList } from "@/web/features/mcp/components/mcp-prompt-list";

export const metadata: Metadata = {
  title: "MCP prompts - GetLib MCP",
  description: "Inspect reusable MCP prompt templates.",
};

export default function Page() {
  return <McpPromptList />;
}
