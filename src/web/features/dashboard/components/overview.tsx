"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LoadError } from "@/web/components/ui/load-error";
import { RankingBarList } from "@/web/components/ui/ranking-bar-list";
import type { StatisticsSnapshot } from "@/web/features/statistics/services/statistics-api.service";
import { rankLibraryFetches } from "@/web/lib/ranking";
import { ArrowRightIcon } from "@/web/components/ui/icons";
import { chartAccent, chartAxisTick, chartGridStroke } from "@/web/features/statistics/components/chart-theme";
import { ChartTooltipCard } from "@/web/features/statistics/components/chart-tooltip";

interface OverviewProps {
  stats: StatisticsSnapshot | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function Overview({ stats, loading, error, retry }: OverviewProps) {
  if (loading) {
    return (
      <Card aria-label="Overview">
        <Card.Header>
          <Card.Title>Overview</Card.Title>
          <Card.Description>Request activity and top fetches.</Card.Description>
        </Card.Header>
        <Card.Content>
          <Skeleton className="h-[220px] rounded-xl" />
        </Card.Content>
      </Card>
    );
  }

  if (error !== null || stats === null) {
    return (
      <Card aria-label="Overview">
        <Card.Header>
          <Card.Title>Overview</Card.Title>
          <Card.Description>Request activity and top fetches.</Card.Description>
        </Card.Header>
        <Card.Content>
          <LoadError message={error ?? "We could not load overview statistics."} onRetry={retry} />
        </Card.Content>
      </Card>
    );
  }

  if (stats.days.length === 0 && stats.fetches.length === 0) {
    return (
      <Card aria-label="Overview">
        <Card.Header>
          <Card.Title>Overview</Card.Title>
          <Card.Description>Request activity and top fetches.</Card.Description>
        </Card.Header>
        <Card.Content>
          <p className="text-sm text-muted">
            No usage recorded yet. Run a search or call a tool to populate this overview.
          </p>
        </Card.Content>
      </Card>
    );
  }

  const summaryItems = [
    { label: "Requests used", value: String(stats.usage.requestsUsed), hint: "Last 10 days" },
    { label: "Docs pages", value: String(stats.usage.docsPages), hint: "Indexed pages" },
    { label: "Success rate", value: `${stats.usage.successRate}%`, hint: "Fetch success" },
  ] as const;
  const topFetches = rankLibraryFetches(stats.fetches, 3);

  return (
    <Card aria-label="Overview">
      <Card.Header>
        <Card.Title>Overview</Card.Title>
        <Card.Description>Request activity and top fetches.</Card.Description>
      </Card.Header>
      <Card.Content>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            accessibilityLayer
            data={stats.days}
            margin={{ top: 8, right: 12, bottom: 0, left: -16 }}
          >
            <CartesianGrid vertical={false} stroke={chartGridStroke} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ ...chartAxisTick }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ ...chartAxisTick }}
            />
            <Tooltip
              cursor={{ stroke: chartGridStroke }}
              content={<ChartTooltipCard />}
            />
            <Line
              type="monotone"
              dataKey="requests"
              stroke={chartAccent}
              strokeWidth={2.5}
              dot={{ fill: chartAccent, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-surface-secondary px-4 py-3"
            >
              <p className="text-xs font-medium tracking-wide text-muted uppercase">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                {item.value}
              </p>
              <p className="mt-0.5 text-xs text-muted">{item.hint}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <RankingBarList entries={topFetches} label="Top fetched libraries" />
        </div>
      </Card.Content>
      <Card.Footer>
        <Link
          href="/statistics"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
        >
          View full statistics
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </Card.Footer>
    </Card>
  );
}
