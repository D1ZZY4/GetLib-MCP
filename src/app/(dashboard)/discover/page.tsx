import type { Metadata } from "next";
import { DiscoverPage } from "@/web/features/discover/components/discover-page";

export const metadata: Metadata = {
  title: "Discover libraries - GetLib MCP",
  description: "Search the mock catalog to resolve a package and browse its docs.",
};

export default function Page() {
  return <DiscoverPage />;
}
