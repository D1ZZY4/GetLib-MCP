import type { Metadata } from "next";
import { DashboardPage } from "@/web/features/dashboard/components/dashboard-page";

export const metadata: Metadata = {
  title: "Library dashboard - GetLib MCP",
  description: "Track installed packages, review MCP activity, and act on version risks.",
};

export default function Page() {
  return <DashboardPage />;
}
