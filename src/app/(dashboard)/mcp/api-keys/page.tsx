import type { Metadata } from "next";
import { McpApiKeys } from "@/web/features/mcp/components/mcp-api-keys";

export const metadata: Metadata = {
  title: "MCP API keys - GetLib MCP",
  description: "Long-lived API keys for MCP clients and scripts.",
};

export default function Page() {
  return <McpApiKeys />;
}
