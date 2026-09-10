"use client";

import { Card, Skeleton } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { StatCardSkeleton } from "@/web/components/ui/skeletons";
import { DocsShareChart } from "./docs-share-chart";
import { FetchRadial } from "./fetch-radial";
import { FetchRanking } from "./fetch-ranking";
import { LibraryTable } from "./library-table";
import { TrendChart } from "./trend-chart";
import { UsageCard } from "./usage-chart";
import { useStatisticsData } from "../hooks/use-statistics-data";

export function StatisticsPage() {
  const { stats, loading, error, retry } = useStatisticsData();

  return (
    <PageContainer>
      <PageHeader
        title="Statistics"
        description={`Usage and performance analytics from authoritative server telemetry.${stats?.isMock ? " Development mock data." : ""}`}
      />

      {loading ? (
        <div role="status" aria-label="Loading statistics" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <Skeleton className="h-72 rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      ) : error !== null || stats === null ? (
        <LoadError message={error ?? "We could not load statistics."} onRetry={retry} />
      ) : (
        <>
          {stats.days.length === 0 && stats.rows.length === 0 && stats.fetches.length === 0 ? (
            <Card>
              <Card.Content>
                <p className="text-sm text-muted">
                  No telemetry recorded yet. Run a search or call a tool to populate these charts.
                </p>
              </Card.Content>
            </Card>
          ) : null}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card variant="secondary">
              <Card.Content>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">Requests</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  {stats.usage.requestsUsed}
                </p>
              </Card.Content>
            </Card>
            <Card variant="secondary">
              <Card.Content>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">
                  Docs pages
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  {stats.usage.docsPages}
                </p>
              </Card.Content>
            </Card>
            <Card variant="secondary">
              <Card.Content>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">
                  Active libraries
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  {stats.usage.activeLibraries}
                </p>
              </Card.Content>
            </Card>
            <Card variant="secondary">
              <Card.Content>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">
                  Success rate
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  {stats.usage.successRate}
                  <span className="text-base font-normal text-muted">%</span>
                </p>
              </Card.Content>
            </Card>
          </div>
          <UsageCard days={stats.days} />
          <div className="grid gap-4 lg:grid-cols-2">
            <TrendChart days={stats.days} />
            <DocsShareChart rows={stats.rows} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <FetchRanking fetches={stats.fetches} />
            <FetchRadial fetches={stats.fetches} />
          </div>
          <LibraryTable rows={stats.rows} />
        </>
      )}
    </PageContainer>
  );
}
