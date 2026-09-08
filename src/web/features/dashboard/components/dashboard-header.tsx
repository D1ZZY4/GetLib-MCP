"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import type { DashboardStats } from "../../../types/library";

interface DashboardHeaderProps {
  stats: DashboardStats;
}

export function DashboardHeader({ stats }: DashboardHeaderProps) {
  const router = useRouter();
  const needsAttention = stats.outdated + stats.vulnerable;

  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Library dashboard
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          {needsAttention > 0
            ? `${needsAttention} ${needsAttention === 1 ? "library needs" : "libraries need"} your attention. Review versions, activity, and risks below.`
            : "Everything is up to date. Review activity and risks below."}{" "}
          All data on this page is local mock data.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" onPress={() => router.push("/statistics")}>
          Scan project
        </Button>
        <Button onPress={() => router.push("/discover")}>Add library</Button>
      </div>
    </header>
  );
}
