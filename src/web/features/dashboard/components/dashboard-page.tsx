"use client";

import { Card } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { AttentionHighlightsPanel } from "./attention-highlights";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { Overview } from "./overview";
import { FallbackWarning, SystemStatusPanel } from "./system-status";
import { PageContainer } from "@/web/components/layout/page-container";
import { ProjectSummaryCard } from "./project-summary-card";
import { QuickActionsPanel } from "./quick-actions";
import { RecentActivityList } from "./recent-activity";
import { StatsRow } from "./stats-grid";
import { useStatisticsData } from "@/web/features/statistics/hooks/use-statistics-data";
import { useDashboardData } from "../hooks/use-dashboard-data";

export function DashboardPage() {
  const { dashboard, loading, error, retry } = useDashboardData();
  const {
    stats,
    loading: statsLoading,
    error: statsError,
    retry: retryStats,
  } = useStatisticsData();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error !== null || dashboard === null) {
    return (
      <PageContainer>
        <LoadError message={error ?? "We could not load the dashboard."} onRetry={retry} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <DashboardHeader dashboard={dashboard} />
      <FallbackWarning dashboard={dashboard} />
      <SystemStatusPanel dashboard={dashboard} />
      {dashboard.isMock ? (
        <>
          <StatsRow stats={dashboard.stats} />
          <Overview stats={stats} loading={statsLoading} error={statsError} retry={retryStats} />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <ProjectSummaryCard libraries={dashboard.libraries} />
            </div>
            <div className="lg:col-span-1">
              <RecentActivityList activities={dashboard.activities} />
            </div>
            <div className="lg:col-span-1">
              <AttentionHighlightsPanel items={dashboard.attentions} />
            </div>
          </div>
        </>
      ) : (
        <>
          <Overview stats={stats} loading={statsLoading} error={statsError} retry={retryStats} />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-1">
              <RecentActivityList activities={dashboard.activities} />
            </div>
            <div className="lg:col-span-1">
              <AttentionHighlightsPanel items={dashboard.attentions} />
            </div>
          </div>
          <Card>
            <Card.Content>
              <p className="text-sm text-muted">
                Live mode has no library inventory. Activity, attention items, and
                telemetry above reflect this server process.
              </p>
            </Card.Content>
          </Card>
        </>
      )}
      <QuickActionsPanel />
    </PageContainer>
  );
}
