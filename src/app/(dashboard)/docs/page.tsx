import type { Metadata } from "next";
import { DocsPage } from "@/web/features/docs/components/docs-page";

export const metadata: Metadata = {
  title: "Docs - GetLib MCP",
  description: "Guides and references for the GetLib MCP server.",
};

export default function DocsRoute() {
  return <DocsPage />;
}
