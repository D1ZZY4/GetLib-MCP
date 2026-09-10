import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "@/web/components/layout/page-container";
import { PanelCardSkeleton, StatCardSkeleton } from "@/web/components/ui/skeletons";

export function DashboardSkeleton() {
  return (
    <PageContainer role="status" ariaLabel="Loading dashboard">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded" />
          <Skeleton className="h-4 w-96 max-w-full rounded" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCardSkeleton icon />
        <StatCardSkeleton icon />
        <StatCardSkeleton icon />
        <StatCardSkeleton icon />
      </div>
      <Card>
        <Card.Header>
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-3 w-64 max-w-full rounded" />
        </Card.Header>
        <Card.Content>
          <Skeleton className="h-55 rounded-xl" />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-19 rounded-xl" />
            <Skeleton className="h-19 rounded-xl" />
            <Skeleton className="h-19 rounded-xl" />
          </div>
          <div className="mt-4 space-y-2.5">
            <Skeleton className="h-4 rounded" style={{ width: "88%" }} />
            <Skeleton className="h-4 rounded" style={{ width: "72%" }} />
            <Skeleton className="h-4 rounded" style={{ width: "58%" }} />
          </div>
        </Card.Content>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <PanelCardSkeleton rows={5} />
        <PanelCardSkeleton rows={4} />
        <PanelCardSkeleton rows={3} />
      </div>
      <Card>
        <Card.Header>
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-3 w-56 rounded" />
        </Card.Header>
        <Card.Content>
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </Card.Content>
      </Card>
    </PageContainer>
  );
}
