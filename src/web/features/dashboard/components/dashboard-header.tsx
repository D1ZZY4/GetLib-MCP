"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import type { DashboardSnapshot } from "../services/dashboard-api.service";

interface DashboardHeaderProps {
  dashboard: DashboardSnapshot;
}

export function DashboardHeader({ dashboard }: DashboardHeaderProps) {
  const router = useRouter();
  const { stats, system } = dashboard;
  const needsAttention = stats.outdated + stats.vulnerable + dashboard.attentions.length;

  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">Dashboard</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          {needsAttention > 0
            ? `${needsAttention} ${needsAttention === 1 ? "item needs" : "items need"} your attention. Review system status, activity, and risks below.`
            : "Systems are healthy. Review activity and risks below."}{" "}
          {system.isMock ? "Development mock data." : `${system.environment} - live data.`}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" onPress={() => router.push("/statistics")}>
          View statistics
        </Button>
        <Button onPress={() => router.push("/discover")}>Discover libraries</Button>
      </div>
    </header>
  );
}
