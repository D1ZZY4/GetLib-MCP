import { Card, Skeleton } from "@heroui/react";

/**
 * Shared structural skeletons. Every loading state mirrors the real
 * layout it stands in for (label/value stat cards, two-line rows,
 * definition grids, detail headers, form rows) so content never jumps
 * shape when data arrives. Pages compose these instead of inventing
 * bare gray boxes per feature.
 */

export function StatCardSkeleton({ icon = false, compact = false }: { icon?: boolean; compact?: boolean }) {
  return (
    <Card variant="secondary" aria-label="Loading statistics" aria-live="polite" role="status">
      <Card.Content>
        <div className="flex items-start justify-between gap-2" aria-hidden="true">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-9 w-14 rounded" />
            {compact ? null : <Skeleton className="h-3 w-24 rounded" />}
          </div>
          {icon ? <Skeleton className="size-9 shrink-0 rounded-xl" /> : null}
        </div>
      </Card.Content>
    </Card>
  );
}

export function PanelCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="h-full" aria-label="Loading panel" aria-live="polite" role="status">
      <Card.Header>
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-3 w-48 rounded" />
      </Card.Header>
      <Card.Content>
        <div className="space-y-2.5" aria-hidden="true">
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

export function ListRowSkeleton({
  action,
}: {
  action: "button" | "pill";
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" aria-label="Loading row" aria-live="polite" role="status">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/5 rounded" />
        <Skeleton className="h-3 w-3/5 rounded" />
      </div>
      {action === "button" ? <Skeleton className="h-8 w-16 shrink-0 rounded-xl" /> : null}
      {action === "pill" ? <Skeleton className="h-6 w-14 shrink-0 rounded-full" /> : null}
    </div>
  );
}
export function DefinitionGridSkeleton() {
  return (
    <div
      aria-label="Loading definitions"
      aria-live="polite"
      role="status"
      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-1.5">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-5 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}

export function DetailHeaderSkeleton() {
  return (
    <div aria-label="Loading detail" aria-live="polite" role="status" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-72 max-w-full rounded" />
    </div>
  );
}

export function DefinitionListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-label="Loading list" aria-live="polite" role="status" className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      ))}
    </div>
  );
}

export function FormRowSkeleton({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  if (orientation === "horizontal") {
    return (
      <div aria-label="Loading form row" aria-live="polite" role="status" className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl sm:w-28" />
      </div>
    );
  }
  return (
    <div aria-label="Loading form row" aria-live="polite" role="status" className="flex flex-col gap-2">
      <Skeleton className="h-3 w-24 rounded" />
      <Skeleton className="h-10 rounded-xl" />
    </div>
  );
}
