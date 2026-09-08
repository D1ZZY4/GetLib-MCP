"use client";

import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { DocsShareChart } from "./docs-share-chart";
import { FetchRadial } from "./fetch-radial";
import { FetchRanking } from "./fetch-ranking";
import { LibraryTable } from "./library-table";
import { TrendChart } from "./trend-chart";
import { UsageCard } from "./usage-chart";
import { useStatistics } from "../hooks/use-statistics";

export function StatisticsPage() {
  const { data: stats, loading } = useStatistics();

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Statistics</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Plan usage and request analytics. Showing sample data.
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading statistics" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      ) : (
        <>
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
