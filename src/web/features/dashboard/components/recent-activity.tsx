import { Card } from "@heroui/react";
import { EmptyState } from "@/web/components/ui/empty-state";
import { activityKindTone } from "@/web/components/ui/status-tone";
import { formatActivityTime } from "@/web/lib/format";
import type { MockActivity } from "@/web/types/library";

interface RecentActivityListProps {
  activities: MockActivity[];
}

export function RecentActivityList({ activities }: RecentActivityListProps) {
  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>Recent activity</Card.Title>
          <Card.Description>Latest MCP operations</Card.Description>
      </Card.Header>
      <Card.Content>
        {activities.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Resolve a library or run a tool and recent operations will appear here."
          />
        ) : (
          <ol className="relative flex flex-col gap-4 pl-5" aria-label="Recent activity items">
            {/* Rail centered under the 11px dots: (11px dot - 1px rail) / 2 = 5px offset. */}
            <span
              aria-hidden="true"
              className="absolute top-2 bottom-2 left-[5px] w-px bg-border"
            />
            {activities.map((activity) => (
              <li key={activity.id} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute top-1.5 -left-5 size-[11px] rounded-full border-2 border-surface ${activityKindTone(activity.kind)}`}
                />
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    <span className="sr-only">{activity.kind}: </span>
                    {activity.title}
                  </p>
                  <time dateTime={activity.timestamp} className="shrink-0 text-xs text-muted tabular-nums">
                    {formatActivityTime(activity.timestamp)}
                  </time>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{activity.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </Card.Content>
    </Card>
  );
}
