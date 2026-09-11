import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsPage } from "@/web/features/settings/components/settings-page";
import { DetailHeaderSkeleton, PanelCardSkeleton } from "@/web/components/ui/skeletons";

export const metadata: Metadata = {
  title: "Settings - GetLib MCP",
  description: "Application configuration, account controls, and development runtime status.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Loading settings" className="flex flex-col gap-4 px-4 py-8">
          <DetailHeaderSkeleton />
          <PanelCardSkeleton rows={5} />
        </div>
      }
    >
      <SettingsPage />
    </Suspense>
  );
}
