import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsPage } from "@/web/features/settings/components/settings-page";

export const metadata: Metadata = {
  title: "Settings - GetLib MCP",
  description: "Application configuration, account controls, and development runtime status.",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-muted">Loading settings.</p>}>
      <SettingsPage />
    </Suspense>
  );
}
