import type { Metadata } from "next";
import { StatisticsPage } from "@/web/features/statistics/components/statistics-page";

export const metadata: Metadata = {
  title: "Statistics - GetLib MCP",
  description: "Full breakdown of library health, weekly activity, and docs coverage.",
};

export default function Page() {
  return <StatisticsPage />;
}
