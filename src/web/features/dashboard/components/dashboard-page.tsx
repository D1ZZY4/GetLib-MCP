"use client";

import { AttentionHighlightsPanel } from "./attention-highlights";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { Overview } from "./overview";
import { PageContainer } from "../../../components/layout/page-container";
import { ProjectSummaryCard } from "./project-summary-card";
import { QuickActionsPanel } from "./quick-actions";
import { RecentActivityList } from "./recent-activity";
import { StatsRow } from "./stats-grid";
import { useDashboard } from "../hooks/use-dashboard";

export function DashboardPage() {
  const { data: dashboard, loading } = useDashboard();

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <PageContainer>
      <DashboardHeader stats={dashboard.stats} />
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
