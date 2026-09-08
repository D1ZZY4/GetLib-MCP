import type { Metadata } from "next";
import { SourceAccessPage } from "@/web/features/sources/components/source-access-page";

export const metadata: Metadata = {
  title: "Source access - GetLib MCP",
  description: "Control which documentation sources and libraries this teamspace can access.",
};

export default function Page() {
  return <SourceAccessPage />;
}
