import { Card, Skeleton } from "@heroui/react";

export function DiscoverSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading results" className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index}>
          <Card.Header>
            <Skeleton className="h-4 w-28 rounded" aria-hidden="true" />
            <Skeleton className="h-3 w-44 max-w-full rounded" aria-hidden="true" />
          </Card.Header>
          <Card.Content>
            <div className="space-y-2" aria-hidden="true">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 rounded" style={{ width: `${72 - (index % 3) * 8}%` }} />
            </div>
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}
