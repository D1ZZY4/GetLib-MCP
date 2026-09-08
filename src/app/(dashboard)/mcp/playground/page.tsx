import type { Metadata } from "next";
import { McpPlayground } from "@/web/features/mcp/components/mcp-playground";

export const metadata: Metadata = {
  title: "MCP playground - GetLib MCP",
  description: "Run any registered MCP tool with custom arguments and inspect the response.",
};

export default function Page() {
  return <McpPlayground />;
}
