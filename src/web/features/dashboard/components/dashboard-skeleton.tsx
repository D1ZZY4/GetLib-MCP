import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "@/web/components/layout/page-container";

function StatCardSkeleton() {
  return (
    <Card variant="secondary">
      <Card.Content>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-8 w-12 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <Skeleton className="size-9 shrink-0 rounded-xl" />
        </div>
      </Card.Content>
    </Card>
  );
}

function PanelCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="h-full">
      <Card.Header>
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-3 w-48 rounded" />
      </Card.Header>
      <Card.Content>
        <div className="space-y-2.5">
          {Array.from({ length: rows }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-4 rounded"
              style={{ width: `${92 - index * 9}%` }}
            />
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <PageContainer role="status" ariaLabel="Loading dashboard">
      <div className="space-y-2 border-b border-border pb-6">
        <Skeleton className="h-8 w-64 rounded" />
        <Skeleton className="h-4 w-96 max-w-full rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
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
