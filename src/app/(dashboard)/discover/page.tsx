import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscoverPage } from "@/web/features/discover/components/discover-page";
import { DiscoverSkeleton } from "@/web/features/discover/components/discover-skeleton";
import { PageContainer } from "@/web/components/layout/page-container";

export const metadata: Metadata = {
  title: "Discover libraries - GetLib MCP",
  description: "Search the catalog to resolve a package and browse its docs.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <DiscoverSkeleton rows={4} />
        </PageContainer>
      }
    >
      <DiscoverPage />
    </Suspense>
  );
}
