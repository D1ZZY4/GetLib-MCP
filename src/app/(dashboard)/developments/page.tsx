import type { Metadata } from "next";
import { DevelopmentsPage } from "@/web/features/development/components/developments-page";

export const metadata: Metadata = {
  title: "Developments - GetLib MCP",
  description: "Development runtime behavior and diagnostics. Available in development only.",
};

export default function Page() {
  return <DevelopmentsPage />;
}
