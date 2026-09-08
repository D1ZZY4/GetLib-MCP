import { Card } from "@heroui/react";
import type { DashboardStats } from "../../../types/library";
import { AlertIcon, CheckIcon, LibraryIcon, ActivityIcon } from "../../../components/ui/icons";

interface StatsRowProps {
  stats: DashboardStats;
}

const STAT_ITEMS: Array<{
  key: keyof DashboardStats;
  label: string;
  description: string;
  icon: (props: { className?: string }) => React.ReactNode;
  tone: string;
}> = [
  {
    key: "totalLibraries",
    label: "Total libraries",
    description: "Tracked packages",
    icon: LibraryIcon,
    tone: "bg-accent/10 text-accent",
  },
  {
    key: "upToDate",
    label: "Up to date",
    description: "On latest version",
    icon: CheckIcon,
    tone: "bg-success/10 text-success",
  },
  {
    key: "outdated",
    label: "Outdated",
    description: "Update available",
    icon: ActivityIcon,
    tone: "bg-warning/10 text-warning",
  },
  {
    key: "vulnerable",
    label: "Vulnerable",
    description: "Needs attention",
    icon: AlertIcon,
    tone: "bg-danger/10 text-danger",
  },
];

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <section aria-label="Library statistics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STAT_ITEMS.map((item) => (
        <Card key={item.key} variant="secondary">
          <Card.Content>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">
                  {item.label}
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                  {stats[item.key]}
                </p>
                <p className="mt-1 text-xs text-muted">{item.description}</p>
              </div>
              <span
                aria-hidden="true"
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}
              >
                <item.icon className="size-4" />
              </span>
            </div>
          </Card.Content>
        </Card>
      ))}
    </section>
  );
}
