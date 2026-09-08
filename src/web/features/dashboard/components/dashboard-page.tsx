"use client";

import { Button, Card } from "@heroui/react";
import { AttentionHighlightsPanel } from "./attention-highlights";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { Overview } from "./overview";
import { FallbackWarning, SystemStatusPanel } from "./system-status";
import { PageContainer } from "../../../components/layout/page-container";
import { ProjectSummaryCard } from "./project-summary-card";
import { QuickActionsPanel } from "./quick-actions";
import { RecentActivityList } from "./recent-activity";
import { StatsRow } from "./stats-grid";
import { useDashboardData } from "../hooks/use-dashboard-data";

export function DashboardPage() {
  const { dashboard, loading, error, retry } = useDashboardData();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error !== null || dashboard === null) {
    return (
      <PageContainer>
        <Card>
          <Card.Header>
            <Card.Title>Dashboard unavailable</Card.Title>
            <Card.Description>{error ?? "We could not load the dashboard."}</Card.Description>
          </Card.Header>
          <Card.Footer>
            <Button variant="secondary" onPress={retry}>
              Retry
            </Button>
          </Card.Footer>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <DashboardHeader dashboard={dashboard} />
      <FallbackWarning dashboard={dashboard} />
      <SystemStatusPanel dashboard={dashboard} />
      <StatsRow stats={dashboard.stats} />
      <Overview />
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
      <QuickActionsPanel />
    </PageContainer>
  );
}
