import { Card, Skeleton } from "@heroui/react";

export function DiscoverSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading results" className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index}>
          <Card.Header>
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3 w-36 rounded" />
          </Card.Header>
          <Card.Content>
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}
